import math
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database.database import get_db
from app.models.room import Room

router = APIRouter()


def room_summary(room):
    node = room.node
    position = None
    if (room.floor_id is not None and node is not None and node.floor_id == room.floor_id
            and node.x is not None and node.y is not None
            and math.isfinite(node.x) and math.isfinite(node.y)):
        position = {"x": node.x, "y": node.y}
    return {"id": room.id, "name": room.name, "floor": room.floor, "floor_id": room.floor_id,
            "building_id": room.building_id, "node_id": room.node_id,
            "building_name": room.building.name if room.building else None,
            "is_demo": room.building.is_demo if room.building else False,
            "map_position": position}


@router.get("/")
def list_rooms(search: str = Query(None), building_id: int | None = Query(None, gt=0),
               db: Session = Depends(get_db)):
    """List rooms by name and/or building, including their indoor door position."""
    query = db.query(Room).options(joinedload(Room.building), joinedload(Room.node))
    if search:
        query = query.filter(Room.name.ilike(f"%{search}%"))
    if building_id is not None:
        query = query.filter(Room.building_id == building_id)
    return [room_summary(room) for room in query.order_by(Room.floor, Room.name, Room.id).all()]


@router.get("/{room_id}")
def get_room(room_id: int, db: Session = Depends(get_db)):
    """GET /api/rooms/{id} - get a single room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        raise HTTPException(status_code=404, detail="ไม่พบห้องที่เลือก")
    return room_summary(room)
