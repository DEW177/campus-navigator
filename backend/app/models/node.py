from sqlalchemy import Column, Integer, Float, String
from app.database.database import Base


class Node(Base):
    """A point in the walkable graph (intersection, door, stairwell, etc.)."""
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    floor = Column(Integer, default=1)
