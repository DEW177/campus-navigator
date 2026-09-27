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
