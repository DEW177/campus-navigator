from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)       # e.g. "SC06-301"
    floor = Column(Integer, default=1)
    building_id = Column(Integer, ForeignKey("buildings.id"))
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)

    building = relationship("Building", back_populates="rooms")
    node = relationship("Node")
