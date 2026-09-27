from pydantic import BaseModel, ConfigDict, Field
from typing import List, Literal
from app.schemas.floor_schema import FloorOut


class NavigationRequest(BaseModel):
    start_node_id: int = Field(gt=0, strict=True)
    end_node_id: int = Field(gt=0, strict=True)
    route_mode: Literal["shortest", "stairs", "elevator"] = "shortest"


class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    latitude: float
    longitude: float
    floor: int
    floor_id: int | None = None

    x: float | None = None
    y: float | None = None
    label: str | None = None
    kind: str = "walk"
    landmark_description: str | None = None
    landmark_image_url: str | None = None


class RouteSegment(BaseModel):
    floor_id: int
    node_ids: list[int]


class DirectionStep(BaseModel):
    kind: str
    text: str
    floor_id: int | None = None
    target_floor_id: int | None = None
    landmark_description: str | None = None
    image_url: str | None = None


class NavigationResponse(BaseModel):
    path: List[NodeOut]
    total_distance: float
    map_type: Literal["outdoor", "indoor"] = "outdoor"
    is_demo: bool = False
    floors: list[FloorOut] = Field(default_factory=list)
    segments: list[RouteSegment] = Field(default_factory=list)
    directions: list[DirectionStep] = Field(default_factory=list)


class StartLocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    floor: int

    floor_id: int | None = None
    building_id: int | None = None
    building_name: str | None = None
    is_demo: bool = False
