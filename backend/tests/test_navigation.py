"""Exercise real routing, ORM serialization and HTTP errors with a test DB."""
import pytest


@pytest.mark.parametrize("url", ["/api/navigate", "/api/navigate/"])
def test_navigation_success(client, url):
    response = client.post(url, json={"start_node_id": 1, "end_node_id": 3})
    assert response.status_code == 200
    data = response.json()
    assert [node["id"] for node in data["path"]] == [1, 2, 3]
    assert data["total_distance"] == 12
    assert data["path"][0] == {
        "id": 1, "latitude": 16.001, "longitude": 102.0, "floor": 1,
    }


def test_same_existing_node(client):
    response = client.post("/api/navigate/", json={"start_node_id": 4, "end_node_id": 4})
    assert response.status_code == 200
    assert response.json()["total_distance"] == 0
    assert [node["id"] for node in response.json()["path"]] == [4]


@pytest.mark.parametrize("start,end,missing", [
    (999, 1, [999]), (1, 999, [999]), (999, 999, [999]),
    (998, 999, [998, 999]),
])
def test_missing_nodes(client, start, end, missing):
    response = client.post("/api/navigate/", json={"start_node_id": start, "end_node_id": end})
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "NODE_NOT_FOUND"
    assert response.json()["detail"]["node_ids"] == missing


def test_disconnected_nodes(client):
    response = client.post("/api/navigate/", json={"start_node_id": 1, "end_node_id": 4})
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "ROUTE_NOT_FOUND"
    assert "Infinity" not in response.text


@pytest.mark.parametrize("field", ["start_node_id", "end_node_id"])
@pytest.mark.parametrize("value", [0, -1, "abc", "1", 1.5, True, None])
def test_invalid_node_ids(client, field, value):
    payload = {"start_node_id": 1, "end_node_id": 3, field: value}
    assert client.post("/api/navigate/", json=payload).status_code == 422


def test_missing_request_fields(client):
    assert client.post("/api/navigate/", json={}).status_code == 422


def test_start_locations_have_names_and_numeric_ids(client, db):
    from app.models.node import Node
    db.add_all([
        Node(id=5, label=None, latitude=16, longitude=102, floor=1),
        Node(id=6, label="  ", latitude=16, longitude=102, floor=1),
    ])
    db.commit()
    response = client.get("/api/navigate/nodes")
    assert response.status_code == 200
    assert response.json() == [
        {"id": i, "label": f"Node {i}", "floor": 1} for i in range(1, 5)
    ]


def test_no_named_start_locations_returns_empty_list(client, db):
    from app.models.node import Node
    db.query(Node).update({Node.label: None})
    db.commit()
    assert client.get("/api/navigate/nodes").json() == []
