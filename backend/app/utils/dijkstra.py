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


def build_graph(db: Session, route_mode="shortest"):
    """Build an adjacency list {node_id: [(neighbor_id, weight), ...]} from the DB."""
    graph = defaultdict(list)
    for conn in db.query(Connection).all():
        if not usable_connection(conn, route_mode):
            continue
        if not math.isfinite(conn.weight) or conn.weight < 0:
            raise GraphDataError("Route weights must be finite and non-negative")
        graph[conn.from_node_id].append((conn.to_node_id, conn.weight))
        if conn.bidirectional:
            graph[conn.to_node_id].append((conn.from_node_id, conn.weight))
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

    graph = build_graph(db, route_mode)
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
