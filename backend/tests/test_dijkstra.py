"""
Unit tests for the Dijkstra shortest-path implementation.
Run with: pytest tests/
"""
import pytest
from unittest.mock import MagicMock
from app.utils.dijkstra import build_graph


def test_build_graph_is_undirected():
    """A connection A-B should create edges in both directions."""
    fake_conn = MagicMock(from_node_id=1, to_node_id=2, weight=5.0)
    db = MagicMock()
    db.query.return_value.all.return_value = [fake_conn]

    graph = build_graph(db)

    assert (2, 5.0) in graph[1]
    assert (1, 5.0) in graph[2]


# TODO: add a test that seeds an in-memory SQLite DB and checks
# find_shortest_path() returns the correct path and distance.
