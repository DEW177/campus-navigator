from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.floor import Floor
from app.schemas.floor_schema import FloorOut

router = APIRouter()


@router.get("/", response_model=list[FloorOut])
def list_floors(building_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Floor)
    if building_id is not None:
        query = query.filter(Floor.building_id == building_id)
    return query.order_by(Floor.building_id, Floor.number).all()


@router.get("/{floor_id}", response_model=FloorOut)
def get_floor(floor_id: int, db: Session = Depends(get_db)):
    floor = db.get(Floor, floor_id)
    if floor is None:
        raise HTTPException(status_code=404, detail="ไม่พบชั้นที่เลือก")
    return floor
