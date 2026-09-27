from pydantic import BaseModel
from typing import List


class NavigationRequest(BaseModel):
    start_node_id: int
    end_node_id: int


class NodeOut(BaseModel):
    id: int
    latitude: float
    longitude: float
    floor: int


class NavigationResponse(BaseModel):
    path: List[NodeOut]
    total_distance: float
