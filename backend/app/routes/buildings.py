from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.building import Building

router = APIRouter()


@router.get("/")
def list_buildings(db: Session = Depends(get_db)):
    """GET /api/buildings - list all buildings."""
    return db.query(Building).all()


@router.get("/{building_id}")
def get_building(building_id: int, db: Session = Depends(get_db)):
    """GET /api/buildings/{id} - get a single building."""
    return db.query(Building).filter(Building.id == building_id).first()
