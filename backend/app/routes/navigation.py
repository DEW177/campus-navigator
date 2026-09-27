from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.navigation_schema import NavigationRequest, NavigationResponse
from app.utils.dijkstra import find_shortest_path

router = APIRouter()


@router.post("/", response_model=NavigationResponse)
def navigate(request: NavigationRequest, db: Session = Depends(get_db)):
    """
    POST /api/navigate
    Body: { "start_node_id": int, "end_node_id": int }
    Returns the shortest path (list of nodes + total distance) using Dijkstra's Algorithm.
    """
    path, distance = find_shortest_path(db, request.start_node_id, request.end_node_id)
    return NavigationResponse(path=path, total_distance=distance)
