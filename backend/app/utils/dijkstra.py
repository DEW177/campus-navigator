"""
Shortest path algorithm (Dijkstra's Algorithm).

Builds a weighted graph from the Node/Connection tables and returns
the shortest path between two nodes. Time complexity: O((V + E) log V)
when used with a min-heap priority queue.
"""
import heapq
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.node import Node
from app.models.connection import Connection


def build_graph(db: Session):
    """Build an adjacency list {node_id: [(neighbor_id, weight), ...]} from the DB."""
    graph = defaultdict(list)
    for conn in db.query(Connection).all():
        graph[conn.from_node_id].append((conn.to_node_id, conn.weight))
        graph[conn.to_node_id].append((conn.from_node_id, conn.weight))  # undirected
    return graph


def find_shortest_path(db: Session, start_id: int, end_id: int):
    """
    Run Dijkstra's Algorithm from start_id to end_id.
    Returns (path: List[Node], total_distance: float).
    """
    graph = build_graph(db)
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
        return [], float("inf")  # no path found

    # Reconstruct path
    path_ids = [end_id]
    while path_ids[-1] != start_id:
        path_ids.append(previous[path_ids[-1]])
    path_ids.reverse()

    nodes = db.query(Node).filter(Node.id.in_(path_ids)).all()
    nodes_by_id = {n.id: n for n in nodes}
    ordered_path = [nodes_by_id[i] for i in path_ids]

    return ordered_path, distances[end_id]
