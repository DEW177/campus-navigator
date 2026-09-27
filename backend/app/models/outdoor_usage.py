"""Shared request guard; stores counts only, never searches or user positions."""
from sqlalchemy import Column, Integer, String, Float
from app.database.database import Base


class OutdoorUsage(Base):
    __tablename__ = "outdoor_usage"
    day = Column(String(10), primary_key=True)
    requests = Column(Integer, nullable=False, default=0)
    next_request_at = Column(Float, nullable=False, default=0)
