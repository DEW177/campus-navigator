from pydantic import BaseModel


class BuildingBase(BaseModel):
    name: str
    code: str
    latitude: float
    longitude: float


class BuildingCreate(BuildingBase):
    pass


class BuildingOut(BuildingBase):
    id: int

    class Config:
        from_attributes = True
