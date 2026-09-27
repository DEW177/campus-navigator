from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.config import settings
from app.database.database import get_db
from app.models import Building
from app.schemas.outdoor_schema import PlaceSearch, OutdoorRouteRequest
from app.services.entrance_service import entrance_summary
from app.services.geoapify_service import coordinate, problem, provider

router = APIRouter()


def destination(db, building_id):
    building = db.get(Building, building_id)
    if building is None:
        raise problem(404, "BUILDING_NOT_FOUND", "ไม่พบอาคารที่เลือก กรุณาเลือกห้องใหม่")
    entrance = entrance_summary(building)
    if not entrance or not coordinate(entrance["latitude"], entrance["longitude"]):
        raise problem(422, "ENTRANCE_UNMAPPED", "อาคารนี้ยังไม่มีพิกัดทางเข้าสำหรับเส้นทางกลางแจ้ง")
    return building, entrance


@router.get("/status")
def status(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return {"configured": bool(settings.GEOAPIFY_API_KEY)}


@router.post("/search")
def search(request: PlaceSearch, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    _, entrance = destination(db, request.building_id)
    return provider.search(db, " ".join(request.query.split()), entrance)


@router.post("/route")
def route(request: OutdoorRouteRequest, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    building, entrance = destination(db, request.building_id)
    result = provider.route(db, request.origin, entrance, request.mode)
    return {**result, "entrance": entrance, "is_demo": building.is_demo}
