from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database.database import Base


class Floor(Base):
    __tablename__ = "floors"
    __table_args__ = (
        UniqueConstraint("building_id", "number"),
        CheckConstraint("width > 0 AND height > 0 AND meters_per_unit > 0"),
    )
    id = Column(Integer, primary_key=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    meters_per_unit = Column(Float, nullable=False)
    building = relationship("Building")
