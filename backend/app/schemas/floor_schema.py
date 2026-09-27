from pydantic import BaseModel, ConfigDict


class FloorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    building_id: int
    number: int
    name: str
    image_url: str
    width: float
    height: float
    meters_per_unit: float
