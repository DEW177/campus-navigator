"""
Unit tests for the Dijkstra shortest-path implementation.
Run with: pytest tests/
"""
import pytest
from unittest.mock import MagicMock
from app.utils.dijkstra import (
    build_graph, find_shortest_path, NodeNotFoundError, RouteNotFoundError,
)


def test_build_graph_is_undirected():
    """A connection A-B should create edges in both directions."""
    fake_conn = MagicMock(from_node_id=1, to_node_id=2, weight=5.0)
    db = MagicMock()
    db.query.return_value.all.return_value = [fake_conn]

    graph = build_graph(db)

    assert (2, 5.0) in graph[1]
    assert (1, 5.0) in graph[2]


@pytest.mark.parametrize("start,end,expected", [(1, 3, [1, 2, 3]), (3, 1, [3, 2, 1])])
def test_shortest_path(db, start, end, expected):
    path, distance = find_shortest_path(db, start, end)
    assert [node.id for node in path] == expected
    assert distance == 12


def test_same_existing_node(db):
    path, distance = find_shortest_path(db, 4, 4)
    assert [node.id for node in path] == [4]
    assert distance == 0


@pytest.mark.parametrize("start,end,missing", [
    (999, 1, [999]), (1, 999, [999]), (999, 999, [999]),
    (998, 999, [998, 999]),
])
def test_missing_nodes(db, start, end, missing):
    with pytest.raises(NodeNotFoundError) as error:
        find_shortest_path(db, start, end)
    assert error.value.node_ids == missing


def test_disconnected_nodes(db):
    with pytest.raises(RouteNotFoundError):
        find_shortest_path(db, 1, 4)
