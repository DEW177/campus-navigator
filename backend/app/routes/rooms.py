from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.room import Room

router = APIRouter()


@router.get("/")
def list_rooms(search: str = Query(None), db: Session = Depends(get_db)):
    """GET /api/rooms?search=... - list rooms, optionally filtered by name."""
    query = db.query(Room)
    if search:
        query = query.filter(Room.name.ilike(f"%{search}%"))
    return query.all()


@router.get("/{room_id}")
def get_room(room_id: int, db: Session = Depends(get_db)):
    """GET /api/rooms/{id} - get a single room."""
    return db.query(Room).filter(Room.id == room_id).first()
