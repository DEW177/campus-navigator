"""
Shortest path algorithm (Dijkstra's Algorithm).

Builds a weighted graph from the Node/Connection tables and returns
the shortest path between two nodes. Time complexity: O((V + E) log V)
when used with a min-heap priority queue.
"""
import heapq
import math
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.node import Node
from app.models.connection import Connection


class NodeNotFoundError(ValueError):
    """One or both requested endpoints do not exist."""

    def __init__(self, node_ids):
        self.node_ids = sorted(node_ids)
        super().__init__(f"Nodes not found: {self.node_ids}")


class RouteNotFoundError(ValueError):
    """The endpoints exist but no walkable route connects them."""


class GraphDataError(ValueError):
    """Invalid map data cannot be presented as a trustworthy route."""


def usable_connection(conn, route_mode="shortest"):
    return conn.is_active and not (
        (route_mode == "stairs" and conn.kind == "elevator") or
        (route_mode == "elevator" and conn.kind == "stairs")
    )


def build_graph(db: Session, route_mode="shortest", start_id=None):
    """Validate active edges reachable from the start, respecting direction/mode.

    A broken edge in a disconnected building must not disable a valid route.
    Without a start, validate the entire graph (useful for map inspection).
    Reachability is determined before reading weights so invalid reachable edges
    still fail closed rather than silently disappearing from the route.
    """
    topology = defaultdict(list)
    for conn in db.query(Connection).all():
        if not usable_connection(conn, route_mode):
            continue
        topology[conn.from_node_id].append((conn.to_node_id, conn.weight))
        if conn.bidirectional:
            topology[conn.to_node_id].append((conn.from_node_id, conn.weight))

    if start_id is None:
        reachable = set(topology)
    else:
        reachable = {start_id}
        pending = [start_id]
        while pending:
            current = pending.pop()
            for neighbor, _ in topology.get(current, []):
                if neighbor not in reachable:
                    reachable.add(neighbor)
                    pending.append(neighbor)

    graph = defaultdict(list)
    for node_id in reachable:
        for neighbor, weight in topology.get(node_id, []):
            if not math.isfinite(weight) or weight < 0:
                raise GraphDataError("Route weights must be finite and non-negative")
            graph[node_id].append((neighbor, weight))
    return graph


def find_shortest_path(db: Session, start_id: int, end_id: int, route_mode="shortest"):
    """
    Run Dijkstra's Algorithm from start_id to end_id.
    Returns (path: List[Node], total_distance: float).
    Raises NodeNotFoundError or RouteNotFoundError for invalid endpoints
    or disconnected nodes, respectively.
    """
    endpoint_ids = {start_id, end_id}
    endpoints = db.query(Node).filter(Node.id.in_(endpoint_ids)).all()
    endpoints_by_id = {node.id: node for node in endpoints}
    missing_ids = endpoint_ids - endpoints_by_id.keys()
    if missing_ids:
        raise NodeNotFoundError(missing_ids)
    if start_id == end_id:
        return [endpoints_by_id[start_id]], 0.0

    graph = build_graph(db, route_mode, start_id)
    distances = {start_id: 0}
    previous = {}
    visited = set()
    queue = [(0, start_id)]

    while queue:
        current_dist, current_node = heapq.heappop(queue)
        if current_node in visited:
            continue
        visited.add(current_node)

        if current_node == end_id:
            break

        for neighbor, weight in graph.get(current_node, []):
            distance = current_dist + weight
            if distance < distances.get(neighbor, float("inf")):
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(queue, (distance, neighbor))

    if end_id not in distances:
        raise RouteNotFoundError("No route connects the requested nodes")

    # Reconstruct path
    path_ids = [end_id]
    while path_ids[-1] != start_id:
        path_ids.append(previous[path_ids[-1]])
    path_ids.reverse()

    nodes = db.query(Node).filter(Node.id.in_(path_ids)).all()
    nodes_by_id = {n.id: n for n in nodes}
    ordered_path = [nodes_by_id[i] for i in path_ids]

    return ordered_path, distances[end_id]
