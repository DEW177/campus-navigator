import math
from app.models import Floor, Building, Connection
from app.schemas.navigation_schema import NavigationResponse, RouteSegment
from app.services.direction_service import build_directions
from app.utils.dijkstra import find_shortest_path, usable_connection, GraphDataError


def calculate_route(db, start_id, end_id, route_mode="shortest"):
    path, distance = find_shortest_path(db, start_id, end_id, route_mode)
    floor_ids = {node.floor_id for node in path if node.floor_id is not None}
    if not floor_ids:
        return NavigationResponse(path=path, total_distance=distance)
    floors = db.query(Floor).filter(Floor.id.in_(floor_ids)).all()
    floor_by_id = {floor.id: floor for floor in floors}
    for node in path:
        floor = floor_by_id.get(node.floor_id)
        if floor is None or node.x is None or node.y is None or not (
            math.isfinite(node.x) and math.isfinite(node.y) and
            0 <= node.x <= floor.width and 0 <= node.y <= floor.height
        ):
            raise GraphDataError("Indoor route has missing/invalid floor coordinates")
    building_ids = {f.building_id for f in floors}
    if len(building_ids) != 1:
        raise GraphDataError("Routes across indoor buildings need an explicit outdoor transition")
    connections = {}
    for edge in db.query(Connection).all():
        if not usable_connection(edge, route_mode):
            continue
        pairs = [(edge.from_node_id, edge.to_node_id)]
        if edge.bidirectional:
            pairs.append((edge.to_node_id, edge.from_node_id))
        for pair in pairs:
            if pair not in connections or edge.weight < connections[pair].weight:
                connections[pair] = edge
    for a, b in zip(path, path[1:]):
        edge = connections[(a.id, b.id)]
        if a.floor_id != b.floor_id and (
            edge.kind not in ("stairs", "elevator") or a.kind != edge.kind or b.kind != edge.kind
        ):
            raise GraphDataError("Invalid floor transition")
    segments = []
    for node in path:
        if not segments or segments[-1].floor_id != node.floor_id:
            segments.append(RouteSegment(floor_id=node.floor_id, node_ids=[]))
        segments[-1].node_ids.append(node.id)
    building = db.get(Building, next(iter(building_ids)))
    return NavigationResponse(path=path, total_distance=distance, map_type="indoor",
        is_demo=building.is_demo, floors=sorted(floors, key=lambda f: f.number),
        segments=segments, directions=build_directions(path, connections, floor_by_id))
