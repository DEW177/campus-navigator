from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class Node(Base):
    """A point in the walkable graph (intersection, door, stairwell, etc.)."""
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    floor = Column(Integer, default=1)

    floor_id = Column(Integer, ForeignKey("floors.id"), nullable=True)
    floor_plan = relationship("Floor")
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    kind = Column(String, nullable=False, default="walk", server_default="walk")
    landmark_description = Column(String, nullable=True)
    landmark_image_url = Column(String, nullable=True)
