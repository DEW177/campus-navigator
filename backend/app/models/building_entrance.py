from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class BuildingEntrance(Base):
    """Explicit handoff between the road-map destination and the indoor graph.

    One designated entrance per building for now. Geographic coordinates are
    optional: a simulated indoor entrance must not become a real-world target.
    """
    __tablename__ = "building_entrances"

    building_id = Column(Integer, ForeignKey("buildings.id"), primary_key=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    building = relationship("Building", back_populates="entrance")
    node = relationship("Node")
