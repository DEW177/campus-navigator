from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.navigation_schema import NavigationRequest, NavigationResponse
from app.utils.dijkstra import NodeNotFoundError, RouteNotFoundError, GraphDataError
from app.models import Node, Floor, Building
from app.services.navigation_service import calculate_route
from app.schemas.navigation_schema import StartLocationOut

router = APIRouter()


@router.get("/nodes", response_model=list[StartLocationOut])
def list_start_locations(db: Session = Depends(get_db)):
    """Named graph locations that users can recognize as a starting point."""
    nodes = db.query(Node).order_by(Node.label, Node.id).all()
    floors = {f.id: f for f in db.query(Floor).all()}
    buildings = {b.id: b for b in db.query(Building).all()}
    result = []
    for node in nodes:
        if not node.label or not node.label.strip():
            continue
        floor = floors.get(node.floor_id)
        building = buildings.get(floor.building_id) if floor else None
        result.append(StartLocationOut(id=node.id, label=node.label, floor=node.floor,
            floor_id=node.floor_id, building_id=building.id if building else None,
            building_name=building.name if building else None, is_demo=building.is_demo if building else False))
    return result


@router.post("/", response_model=NavigationResponse)
def navigate(request: NavigationRequest, db: Session = Depends(get_db)):
    """
    POST /api/navigate
    Body: { "start_node_id": int, "end_node_id": int }
    Returns the shortest path (list of nodes + total distance) using Dijkstra's Algorithm.
    """
    try:
        return calculate_route(db, request.start_node_id, request.end_node_id, request.route_mode)
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
    except GraphDataError as exc:
        raise HTTPException(status_code=409, detail={
            "code": "INVALID_MAP_DATA",
            "message": "ข้อมูลแผนผังหรือทางเชื่อมยังไม่สมบูรณ์ กรุณาเลือกเส้นทางอื่น",
        }) from exc
