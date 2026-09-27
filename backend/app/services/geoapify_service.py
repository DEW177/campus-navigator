"""A bounded, server-only adapter. Provider bodies/URLs must not reach clients."""
import copy
import hashlib
import json
import math
import time
from collections import OrderedDict
from datetime import datetime, timezone
from threading import Lock

import httpx
from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.config import settings
from app.models.outdoor_usage import OutdoorUsage
from app.utils.haversine import haversine_distance


def problem(status, code, message):
    return HTTPException(status_code=status, detail={"code": code, "message": message},
                         headers={"Retry-After": "1"} if status == 429 else None)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def coordinate(lat, lon):
    return finite(lat) and finite(lon) and abs(lat) <= 90 and abs(lon) <= 180


def reserve_request(db):
    """Atomic shared limit across workers, retained through container restarts."""
    now = time.time()
    day = datetime.fromtimestamp(now, timezone.utc).date().isoformat()
    insert = sqlite_insert if db.bind.dialect.name == "sqlite" else pg_insert
    db.execute(insert(OutdoorUsage).values(day=day, requests=0, next_request_at=0)
               .on_conflict_do_nothing(index_elements=["day"]))
    accepted = db.execute(update(OutdoorUsage).where(
        OutdoorUsage.day == day,
        OutdoorUsage.requests < settings.GEOAPIFY_DAILY_REQUEST_LIMIT,
        OutdoorUsage.next_request_at <= now,
    ).values(requests=OutdoorUsage.requests + 1, next_request_at=now + 0.3)).rowcount
    db.commit()  # Count attempts even when the upstream request fails.
    if not accepted:
        count = db.get(OutdoorUsage, day, populate_existing=True).requests
        if count >= settings.GEOAPIFY_DAILY_REQUEST_LIMIT:
            raise problem(429, "DAILY_LIMIT", "วันนี้ใช้บริการค้นหาและเส้นทางถึงขีดจำกัดแล้ว เลือกจุดบนแผนที่หรือเปิด Google Maps ได้")
        raise problem(429, "RATE_LIMIT", "มีคำขอพร้อมกันมาก กรุณารอสักครู่แล้วลองอีกครั้ง")


class GeoapifyService:
    def __init__(self):
        self.cache = OrderedDict()
        self.lock = Lock()

    def request(self, db, path, params):
        if not settings.GEOAPIFY_API_KEY:
            raise problem(503, "NOT_CONFIGURED", "บริการค้นหาและเส้นทางยังไม่พร้อม เลือกจุดบนแผนที่และเปิด Google Maps ได้")
        cache_key = hashlib.sha256(json.dumps([path, params, settings.GEOAPIFY_API_KEY],
            sort_keys=True).encode()).hexdigest()
        with self.lock:
            cached = self.cache.get(cache_key)
            if cached and cached[0] > time.monotonic():
                self.cache.move_to_end(cache_key)
                return copy.deepcopy(cached[1])
        reserve_request(db)
        try:
            response = httpx.get("https://api.geoapify.com/v1/" + path,
                params={**params, "apiKey": settings.GEOAPIFY_API_KEY}, timeout=12.0,
                follow_redirects=False)
            if response.status_code in (401, 403):
                raise problem(503, "PROVIDER_AUTH", "บริการค้นหาและเส้นทางยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบ")
            if response.status_code == 429:
                raise problem(429, "PROVIDER_LIMIT", "บริการค้นหาและเส้นทางถึงขีดจำกัดชั่วคราว เลือกจุดบนแผนที่หรือเปิด Google Maps ได้")
            if path == "routing" and response.status_code in (400, 404):
                raise problem(404, "ROUTE_NOT_FOUND", "ไม่พบเส้นทางสำหรับวิธีเดินทางนี้ ลองเปลี่ยนจุดเริ่มต้นหรือวิธีเดินทาง")
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise ValueError("Invalid provider response")
        except httpx.TimeoutException:
            raise problem(504, "PROVIDER_TIMEOUT", "บริการตอบกลับช้า กรุณาลองอีกครั้ง หรือเปิด Google Maps") from None
        except (httpx.HTTPError, ValueError):
            raise problem(502, "PROVIDER_UNAVAILABLE", "เชื่อมต่อบริการค้นหาและเส้นทางไม่ได้ กรุณาลองอีกครั้ง") from None
        with self.lock:
            self.cache[cache_key] = (time.monotonic() + 60, copy.deepcopy(data))
            self.cache.move_to_end(cache_key)
            while len(self.cache) > 128:
                self.cache.popitem(last=False)
        return data

    def search(self, db, query, entrance):
        data = self.request(db, "geocode/search", {
            "text": query, "filter": "countrycode:th", "lang": "th", "limit": 5,
            "bias": f"proximity:{entrance['longitude']},{entrance['latitude']}", "format": "json",
        })
        results = data.get("results")
        if not isinstance(results, list):
            raise problem(502, "INVALID_RESPONSE", "บริการส่งผลค้นหาไม่สมบูรณ์ กรุณาลองอีกครั้ง")
        places = []
        for item in results[:5]:
            if not isinstance(item, dict) or not coordinate(item.get("lat"), item.get("lon")):
                continue
            label = item.get("formatted")
            if not isinstance(label, str) or not label.strip():
                continue
            source = item.get("datasource") or {}
            attribution = source.get("attribution") if isinstance(source, dict) else None
            places.append({"label": label[:500], "latitude": item["lat"], "longitude": item["lon"],
                "attribution": attribution[:300] if isinstance(attribution, str) else ""})
        return {"results": places}

    def route(self, db, origin, entrance, mode):
        data = self.request(db, "routing", {
            "waypoints": f"{origin.latitude},{origin.longitude}|{entrance['latitude']},{entrance['longitude']}",
            "mode": mode, "units": "metric", "format": "geojson",
        })
        features = data.get("features")
        if features == []:
            raise problem(404, "ROUTE_NOT_FOUND", "ไม่พบเส้นทางสำหรับวิธีเดินทางนี้ ลองเปลี่ยนจุดเริ่มต้นหรือวิธีเดินทาง")
        try:
            feature = features[0]
            geometry, properties = feature["geometry"], feature["properties"]
            lines = geometry["coordinates"]
            if geometry["type"] == "LineString":
                lines = [lines]
            elif geometry["type"] != "MultiLineString":
                raise ValueError()
            if not isinstance(lines, list) or not lines or sum(map(len, lines)) > 100000:
                raise ValueError()
            for line in lines:
                if not isinstance(line, list) or len(line) < 2:
                    raise ValueError()
                for point in line:
                    if not isinstance(point, list) or len(point) != 2 or not coordinate(point[1], point[0]):
                        raise ValueError()
            distance, duration = properties["distance"], properties["time"]
            if not finite(distance) or distance < 0 or not finite(duration) or duration < 0:
                raise ValueError()
        except (KeyError, IndexError, TypeError, ValueError):
            raise problem(502, "INVALID_RESPONSE", "บริการส่งเส้นทางไม่สมบูรณ์ กรุณาลองอีกครั้ง") from None
        # Show gaps to snapped roads honestly; never invent a connector to a door.
        start, end = lines[0][0], lines[-1][-1]
        return {"geometry": {"type": "MultiLineString", "coordinates": lines},
            "distance_m": distance, "duration_s": duration, "mode": mode,
            "start_gap_m": round(haversine_distance(origin.latitude, origin.longitude, start[1], start[0])),
            "end_gap_m": round(haversine_distance(entrance["latitude"], entrance["longitude"], end[1], end[0]))}


provider = GeoapifyService()
