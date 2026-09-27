"""Real graph/API coverage: multiple floors, mode restrictions and invalid data."""
import copy
import json
import pytest
from app.database.load_demo import load_demo, validate_data, DEMO_FILE
from app.models import Building, Floor, Node, Room, Connection


@pytest.fixture
def demo(db):
    building = load_demo(db)
    db.commit()
    floors = {f.number: f for f in db.query(Floor).filter_by(building_id=building.id)}
    nodes = {(n.floor, n.label): n for n in db.query(Node).filter(Node.floor_id.in_([f.id for f in floors.values()]))}
    return building, floors, nodes


def endpoints(db, demo, start_floor=1, target="DEMO-301"):
    floor = demo[1][start_floor]
    start = db.query(Node).filter_by(floor_id=floor.id, x=80, y=300).one()
    end = db.query(Room).filter_by(name=target).one().node_id
    return {"start_node_id": start.id, "end_node_id": end}


@pytest.mark.parametrize("mode,vertical", [("shortest", "stairs"), ("stairs", "stairs"), ("elevator", "elevator")])
def test_three_floor_route(client, db, demo, mode, vertical):
    response = client.post("/api/navigate/", json={**endpoints(db, demo), "route_mode": mode})
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["map_type"] == "indoor" and data["is_demo"] is True
    assert [f["number"] for f in data["floors"]] == [1, 2, 3]
    assert [segment["floor_id"] for segment in data["segments"]] == [demo[1][n].id for n in (1, 2, 3)]
    node_by_id = {node["id"]: node for node in data["path"]}
    assert [node for s in data["segments"] for node in s["node_ids"]] == [node["id"] for node in data["path"]]
    for segment in data["segments"]:
        assert all(node_by_id[node_id]["floor_id"] == segment["floor_id"] for node_id in segment["node_ids"])
    transitions = [step for step in data["directions"] if step["target_floor_id"] is not None]
    assert len(transitions) == 2
    assert all(step["kind"] == vertical and step["text"].startswith("ขึ้น") and step["image_url"] for step in transitions)
    assert data["directions"][-1]["kind"] == "arrive"
    assert data["total_distance"] == pytest.approx(36.5 if vertical == "stairs" else 81.5)


def test_same_floor_and_same_point(client, db, demo):
    request = endpoints(db, demo, target="DEMO-101")
    data = client.post("/api/navigate/", json=request).json()
    assert data["total_distance"] == pytest.approx(16.5)
    assert len(data["segments"]) == 1
    assert not any(step["target_floor_id"] for step in data["directions"])
    data = client.post("/api/navigate/", json={**request, "start_node_id": request["end_node_id"]}).json()
    assert data["total_distance"] == 0 and len(data["path"]) == 1
    assert len(data["segments"][0]["node_ids"]) == 1


def test_downstairs_instructions(client, db, demo):
    data = client.post("/api/navigate/", json={**endpoints(db, demo, start_floor=3, target="DEMO-101"), "route_mode": "stairs"}).json()
    transitions = [s for s in data["directions"] if s["target_floor_id"]]
    assert len(transitions) == 2 and all(s["text"].startswith("ลงบันได") for s in transitions)


def test_closed_lift_does_not_fall_back_to_stairs(client, db, demo):
    db.query(Connection).filter_by(kind="elevator").update({Connection.is_active: False})
    db.commit()
    response = client.post("/api/navigate/", json={**endpoints(db, demo), "route_mode": "elevator"})
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "ROUTE_NOT_FOUND"
    assert client.post("/api/navigate/", json=endpoints(db, demo)).status_code == 200


def test_one_way_floor_transition_is_respected(client, db, demo):
    db.query(Connection).filter_by(kind="stairs").update({Connection.bidirectional: False})
    db.commit()
    assert client.post("/api/navigate/", json={**endpoints(db, demo), "route_mode": "stairs"}).status_code == 200
    response = client.post("/api/navigate/", json={**endpoints(db, demo, start_floor=3, target="DEMO-101"), "route_mode": "stairs"})
    assert response.status_code == 404


def test_invalid_coordinates_and_transitions_fail_clearly(client, db, demo):
    request = endpoints(db, demo)
    start = db.get(Node, request["start_node_id"])
    start.x = -10
    db.commit()
    response = client.post("/api/navigate/", json=request)
    assert response.status_code == 409 and response.json()["detail"]["code"] == "INVALID_MAP_DATA"
    start.x = 80
    edge = db.query(Connection).filter_by(kind="stairs").first()
    edge.kind = "walk"
    db.commit()
    assert client.post("/api/navigate/", json=request).status_code == 409


def test_invalid_weight_and_mode(client, db, demo):
    request = endpoints(db, demo)
    assert client.post("/api/navigate/", json={**request, "route_mode": "teleport"}).status_code == 422
    db.query(Connection).first().weight = -1
    db.commit()
    assert client.post("/api/navigate/", json=request).status_code == 409


def test_demo_api_metadata_assets_and_idempotence(client, db, demo):
    before = {model: db.query(model).count() for model in (Building, Floor, Node, Room, Connection)}
    assert load_demo(db).id == demo[0].id
    assert {model: db.query(model).count() for model in before} == before
    rooms = client.get("/api/rooms/", params={"search": "DEMO"}).json()
    assert len(rooms) == 9 and all(r["is_demo"] and r["floor_id"] and r["building_name"] for r in rooms)
    assert client.get(f'/api/rooms/{rooms[0]["id"]}').json() == rooms[0]
    floors = client.get("/api/floors/", params={"building_id": demo[0].id}).json()
    assert [f["number"] for f in floors] == [1, 2, 3]
    assert client.get("/api/floors/99999").status_code == 404
    for floor in floors:
        assert client.get(floor["image_url"]).status_code == 200
    starts = client.get("/api/navigate/nodes").json()
    indoor = [n for n in starts if n["building_id"] == demo[0].id]
    assert indoor and all(n["is_demo"] and n["floor_id"] for n in indoor)
    assert db.get(Room, 10).name == "SC06-301"  # original records kept
    for kind in ("stairs", "elevator"):
        assert client.get(f"/static/landmarks/demo-{kind}.svg").status_code == 200


def test_import_rejects_bad_floor_geometry_and_connections():
    original = json.loads(DEMO_FILE.read_text())
    data = copy.deepcopy(original)
    data["nodes"][0]["x"] = -1
    with pytest.raises(ValueError, match="outside"):
        validate_data(data)
    data = copy.deepcopy(original)
    next(e for e in data["connections"] if e["kind"] == "stairs")["kind"] = "walk"
    with pytest.raises(ValueError, match="Cross-floor"):
        validate_data(data)
