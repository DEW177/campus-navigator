from pydantic import BaseModel
from typing import Optional


class RoomBase(BaseModel):
    name: str
    floor: int = 1
    building_id: int


class RoomCreate(RoomBase):
    pass


class RoomOut(RoomBase):
    id: int
    node_id: Optional[int] = None

    class Config:
        from_attributes = True
