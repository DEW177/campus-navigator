from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False)     # e.g. "CP353761"
    name = Column(String, nullable=False)
    section = Column(String, nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))

    room = relationship("Room")
