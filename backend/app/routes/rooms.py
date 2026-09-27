from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database.database import get_db
from app.models.room import Room

router = APIRouter()


def room_summary(room):
    return {"id": room.id, "name": room.name, "floor": room.floor, "floor_id": room.floor_id,
            "building_id": room.building_id, "node_id": room.node_id,
            "building_name": room.building.name if room.building else None,
            "is_demo": room.building.is_demo if room.building else False}



@router.get("/")
def list_rooms(search: str = Query(None), db: Session = Depends(get_db)):
    """GET /api/rooms?search=... - list rooms, optionally filtered by name."""
    query = db.query(Room).options(joinedload(Room.building))
    if search:
        query = query.filter(Room.name.ilike(f"%{search}%"))
    return [room_summary(room) for room in query.all()]


@router.get("/{room_id}")
def get_room(room_id: int, db: Session = Depends(get_db)):
    """GET /api/rooms/{id} - get a single room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        raise HTTPException(status_code=404, detail="ไม่พบห้องที่เลือก")
    return room_summary(room)
