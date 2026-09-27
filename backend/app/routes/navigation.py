from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.navigation_schema import NavigationRequest, NavigationResponse
from app.utils.dijkstra import find_shortest_path, NodeNotFoundError, RouteNotFoundError
from app.models.node import Node
from app.schemas.navigation_schema import StartLocationOut

router = APIRouter()


@router.get("/nodes", response_model=list[StartLocationOut])
def list_start_locations(db: Session = Depends(get_db)):
    """Named graph locations that users can recognize as a starting point."""
    nodes = db.query(Node).order_by(Node.label, Node.id).all()
    return [node for node in nodes if node.label and node.label.strip()]


@router.post("/", response_model=NavigationResponse)
def navigate(request: NavigationRequest, db: Session = Depends(get_db)):
    """
    POST /api/navigate
    Body: { "start_node_id": int, "end_node_id": int }
    Returns the shortest path (list of nodes + total distance) using Dijkstra's Algorithm.
    """
    try:
        path, distance = find_shortest_path(db, request.start_node_id, request.end_node_id)
    except NodeNotFoundError as exc:
        raise HTTPException(status_code=404, detail={
            "code": "NODE_NOT_FOUND",
            "message": "ไม่พบจุดเริ่มต้นหรือจุดหมายที่ระบุ",
            "node_ids": exc.node_ids,
        }) from exc
    except RouteNotFoundError as exc:
        raise HTTPException(status_code=404, detail={
            "code": "ROUTE_NOT_FOUND",
            "message": "ไม่พบเส้นทางเชื่อมระหว่างจุดเริ่มต้นกับจุดหมาย",
        }) from exc
    return NavigationResponse(path=path, total_distance=distance)
