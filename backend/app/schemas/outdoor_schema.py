from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class Coordinates(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class PlaceSearch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    query: str = Field(min_length=2, max_length=200)
    building_id: int = Field(gt=0)


class OutdoorRouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    origin: Coordinates
    building_id: int = Field(gt=0)
    mode: Literal["walk", "drive"] = "walk"
