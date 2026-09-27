import copy
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Node, BuildingEntrance, OutdoorUsage
from app.services.geoapify_service import provider, reserve_request

SEARCH = {"query": "หอพัก ขอนแก่น", "building_id": 1}
ROUTE = {"origin": {"latitude": 16.01, "longitude": 102.01}, "building_id": 1, "mode": "walk"}
SEARCH_RESULT = {"results": [
    {"lat": 16.01, "lon": 102.01, "formatted": "หอพัก ขอนแก่น", "secret": "ignore",
     "datasource": {"attribution": "© OpenStreetMap contributors"}},
    {"lat": 900, "lon": 2, "formatted": "bad"}]}
ROUTE_RESULT = {"features": [{"geometry": {"type": "MultiLineString",
    "coordinates": [[[102.01, 16.01], [102.02, 16.005], [102, 16.003]]]},
    "properties": {"distance": 1200, "time": 800, "untrusted": "ignore"}}]}


@pytest.fixture(autouse=True)
def outdoor_setup(monkeypatch, db):
    node = db.get(Node, 3)
    node.kind = "entrance"
    db.add(BuildingEntrance(building_id=1, node_id=3, latitude=16.003, longitude=102.0))
    db.commit()
    provider.cache.clear()
    monkeypatch.setattr(settings, "GEOAPIFY_API_KEY", "test-key-never-forward")
    monkeypatch.setattr(settings, "GEOAPIFY_DAILY_REQUEST_LIMIT", 1000)


def provider_reply(monkeypatch, data, status=200):
    calls = []
    def get(url, **kwargs):
        calls.append((url, kwargs))
        return httpx.Response(status, json=data, request=httpx.Request("GET", url))
    monkeypatch.setattr(httpx, "get", get)
    return calls


def test_missing_key_does_not_call_provider_or_expose_secret(client, db, monkeypatch):
    monkeypatch.setattr(settings, "GEOAPIFY_API_KEY", "")
    calls = provider_reply(monkeypatch, SEARCH_RESULT)
    assert client.get("/api/outdoor/status").json() == {"configured": False}
    for endpoint, payload in [("search", SEARCH), ("route", ROUTE)]:
        response = client.post(f"/api/outdoor/{endpoint}", json=payload)
        assert response.status_code == 503
        assert response.json()["detail"]["code"] == "NOT_CONFIGURED"
    assert calls == []
    assert db.query(OutdoorUsage).count() == 0


def test_search_is_filtered_normalized_cached_and_never_leaks_key(client, db, monkeypatch):
    calls = provider_reply(monkeypatch, SEARCH_RESULT)
    response = client.post("/api/outdoor/search", json={**SEARCH, "query": " หอพัก   ขอนแก่น "})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["results"] == [{"latitude": 16.01, "longitude": 102.01,
        "label": "หอพัก ขอนแก่น", "attribution": "© OpenStreetMap contributors"}]
    assert client.post("/api/outdoor/search", json=SEARCH).json() == response.json()
    assert len(calls) == 1
    assert db.query(OutdoorUsage).one().requests == 1
    params = calls[0][1]["params"]
    assert params["filter"] == "countrycode:th" and params["lang"] == "th"
    assert params["bias"] == "proximity:102.0,16.003"
    assert settings.GEOAPIFY_API_KEY not in response.text
    assert client.get("/api/outdoor/status").json() == {"configured": True}


def test_empty_search_is_success_not_fake_result(client, monkeypatch):
    provider_reply(monkeypatch, {"results": []})
    assert client.post("/api/outdoor/search", json=SEARCH).json() == {"results": []}


@pytest.mark.parametrize("mode", ["walk", "drive"])
def test_route_uses_designated_entrance_and_lonlat_geometry(client, monkeypatch, mode):
    calls = provider_reply(monkeypatch, ROUTE_RESULT)
    response = client.post("/api/outdoor/route", json={**ROUTE, "mode": mode})
    assert response.status_code == 200
    data = response.json()
    assert data["geometry"] == ROUTE_RESULT["features"][0]["geometry"]
    assert data["distance_m"] == 1200 and data["duration_s"] == 800
    assert data["mode"] == mode and data["end_gap_m"] == 0
    assert data["entrance"]["node_id"] == 3
    params = calls[0][1]["params"]
    assert params["waypoints"] == "16.01,102.01|16.003,102.0"
    assert params["mode"] == mode and params["units"] == "metric"
    assert "details" not in params and "untrusted" not in response.text


def test_snapped_destination_gap_is_exposed_without_inventing_line(client, monkeypatch):
    data = copy.deepcopy(ROUTE_RESULT)
    data["features"][0]["geometry"]["coordinates"][0][-1] = [102.02, 16.01]
    provider_reply(monkeypatch, data)
    result = client.post("/api/outdoor/route", json=ROUTE).json()
    assert result["end_gap_m"] > 100
    assert result["geometry"] == data["features"][0]["geometry"]


@pytest.mark.parametrize("status,code", [(401, "PROVIDER_AUTH"), (403, "PROVIDER_AUTH"),
    (429, "PROVIDER_LIMIT"), (500, "PROVIDER_UNAVAILABLE")])
def test_upstream_failures_are_safe_and_no_retry(client, db, monkeypatch, status, code):
    calls = provider_reply(monkeypatch, {"message": settings.GEOAPIFY_API_KEY}, status)
    response = client.post("/api/outdoor/search", json=SEARCH)
    assert response.json()["detail"]["code"] == code
    assert settings.GEOAPIFY_API_KEY not in response.text
    assert len(calls) == 1 and db.query(OutdoorUsage).one().requests == 1


def test_timeout_is_explained_without_leaking_url(client, monkeypatch):
    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("provider url apiKey=" + settings.GEOAPIFY_API_KEY)
    monkeypatch.setattr(httpx, "get", timeout)
    response = client.post("/api/outdoor/route", json=ROUTE)
    assert response.status_code == 504
    assert settings.GEOAPIFY_API_KEY not in response.text


@pytest.mark.parametrize("data,status,code", [({"features": []}, 200, "ROUTE_NOT_FOUND"),
    ({"message": "no path"}, 400, "ROUTE_NOT_FOUND"),
    ({"features": [{}]}, 200, "INVALID_RESPONSE"),
    ({"features": [{"geometry": {"type": "MultiLineString", "coordinates": [[[900, 16], [1, 2]]]},
                     "properties": {"distance": 1, "time": 1}}]}, 200, "INVALID_RESPONSE")])
def test_no_route_and_malformed_geometry(client, monkeypatch, data, status, code):
    provider_reply(monkeypatch, data, status)
    response = client.post("/api/outdoor/route", json=ROUTE)
    assert response.json()["detail"]["code"] == code


@pytest.mark.parametrize("endpoint,payload", [("search", {**SEARCH, "query": " "}),
    ("search", {**SEARCH, "query": "a" * 201}),
    ("route", {**ROUTE, "mode": "flight"}),
    ("route", {**ROUTE, "origin": {"latitude": 91, "longitude": 102}}),
    ("route", {**ROUTE, "destination": {"latitude": 1, "longitude": 2}})])
def test_invalid_input_is_rejected_before_provider(client, monkeypatch, endpoint, payload):
    calls = provider_reply(monkeypatch, {})
    assert client.post(f"/api/outdoor/{endpoint}", json=payload).status_code == 422
    assert not calls


def test_demo_with_no_world_coordinates_cannot_be_routed(client, db, monkeypatch):
    from app.database.load_demo import load_demo
    demo = load_demo(db)
    db.commit()
    calls = provider_reply(monkeypatch, ROUTE_RESULT)
    response = client.post("/api/outdoor/route", json={**ROUTE, "building_id": demo.id})
    assert response.json()["detail"]["code"] == "ENTRANCE_UNMAPPED"
    assert not calls


def test_persistent_daily_and_rate_guard_before_provider(client, db, monkeypatch):
    calls = provider_reply(monkeypatch, SEARCH_RESULT)
    client.post("/api/outdoor/search", json=SEARCH)
    usage = db.query(OutdoorUsage).one()
    usage.next_request_at = time.time() + 100
    db.commit()
    response = client.post("/api/outdoor/search", json={**SEARCH, "query": "another query"})
    assert response.json()["detail"]["code"] == "RATE_LIMIT"
    monkeypatch.setattr(settings, "GEOAPIFY_DAILY_REQUEST_LIMIT", 1)
    response = client.post("/api/outdoor/route", json=ROUTE)
    assert response.json()["detail"]["code"] == "DAILY_LIMIT"
    assert len(calls) == 1
    # New adapter/server process sees the same persisted count.
    from app.services.geoapify_service import GeoapifyService
    with Session(db.bind) as other:
        with pytest.raises(HTTPException) as error:
            GeoapifyService().request(other, "geocode/search", {"text": "uncached"})
        assert error.value.detail["code"] == "DAILY_LIMIT"


def test_atomic_limit_across_concurrent_connections(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path}/quota.db", connect_args={"timeout": 10})
    OutdoorUsage.__table__.create(engine)
    monkeypatch.setattr(settings, "GEOAPIFY_DAILY_REQUEST_LIMIT", 1)
    def attempt(_):
        with Session(engine) as session:
            try:
                reserve_request(session)
                return True
            except HTTPException:
                return False
    with ThreadPoolExecutor(max_workers=6) as pool:
        assert sum(pool.map(attempt, range(6))) == 1
    engine.dispose()


def test_utc_rollover_starts_new_counter(db, monkeypatch):
    monkeypatch.setattr(settings, "GEOAPIFY_DAILY_REQUEST_LIMIT", 1)
    monkeypatch.setattr("app.services.geoapify_service.time.time", lambda: 1_800_000_000)
    reserve_request(db)
    monkeypatch.setattr("app.services.geoapify_service.time.time", lambda: 1_800_086_400)
    reserve_request(db)
    assert db.query(OutdoorUsage).count() == 2
