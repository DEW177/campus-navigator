from pydantic import BaseModel, ConfigDict, Field
from typing import List


class NavigationRequest(BaseModel):
    start_node_id: int = Field(gt=0, strict=True)
    end_node_id: int = Field(gt=0, strict=True)


class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    latitude: float
    longitude: float
    floor: int


class NavigationResponse(BaseModel):
    path: List[NodeOut]
    total_distance: float


class StartLocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    floor: int
