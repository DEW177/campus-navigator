"""Room lookup and graph destination used by the search-to-navigation flow."""


def test_search_returns_room_node_id(client):
    response = client.get("/api/rooms/", params={"search": "301"})
    assert response.status_code == 200
    assert len(response.json()) == 1
    room = response.json()[0]
    assert room["id"] == 10
    assert room["node_id"] == 3


def test_room_url_restores_destination(client):
    response = client.get("/api/rooms/10")
    assert response.status_code == 200
    assert response.json()["name"] == "SC06-301"
    assert response.json()["node_id"] == 3


def test_missing_room_returns_404(client):
    assert client.get("/api/rooms/999").status_code == 404


def test_room_without_route_still_returns_room_details(client):
    response = client.get("/api/rooms/11")
    assert response.status_code == 200
    assert response.json()["node_id"] is None
    assert response.json()["map_position"] is None


def test_building_filter_and_room_coordinates(client, db):
    from app.database.load_demo import load_demo
    demo = load_demo(db)
    db.commit()
    response = client.get("/api/rooms/", params={"building_id": demo.id})
    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) == 9
    assert all(room["building_id"] == demo.id and room["is_demo"] for room in rooms)
    assert rooms[0]["name"] == "DEMO-101"
    assert rooms[0]["map_position"] == {"x": 350, "y": 240}
    assert client.get(f'/api/rooms/{rooms[0]["id"]}').json() == rooms[0]
    matched = client.get("/api/rooms/", params={"building_id": demo.id, "search": "301"}).json()
    assert [room["name"] for room in matched] == ["DEMO-301"]
    assert client.get("/api/rooms/", params={"building_id": 999}).json() == []
    assert client.get("/api/rooms/", params={"building_id": 0}).status_code == 422
    assert client.get("/api/rooms/10").json()["map_position"] is None


def test_room_on_mismatched_floor_does_not_expose_wrong_position(client, db):
    from app.database.load_demo import load_demo
    from app.models import Room
    demo = load_demo(db)
    room = db.query(Room).filter_by(building_id=demo.id, name="DEMO-101").one()
    wrong_floor = db.query(Room).filter_by(building_id=demo.id, name="DEMO-301").one()
    room.floor_id = wrong_floor.floor_id
    db.commit()
    assert client.get(f"/api/rooms/{room.id}").json()["map_position"] is None
