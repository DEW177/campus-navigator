from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.database.database import Base


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True)  # e.g. "SC06"
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    rooms = relationship("Room", back_populates="building")
