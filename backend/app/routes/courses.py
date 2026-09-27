from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.course import Course

router = APIRouter()


@router.get("/")
def list_courses(db: Session = Depends(get_db)):
    """GET /api/courses - list all courses and their room locations."""
    return db.query(Course).all()
