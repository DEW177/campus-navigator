"""Real reference plans must not silently become surveyed indoor routes."""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.database.load_sc09 import load_sc09
from app.database.load_demo import load_demo
from app.migrations.upgrade import upgrade_database
from app.models import Building, Floor, Node, Room, Connection


def test_sc09_is_searchable_with_five_plans_and_no_invented_door_or_scale(client, db):
    building = load_sc09(db)
    db.commit()
    rooms = client.get("/api/rooms/", params={"building_id": building.id}).json()
    assert len(rooms) == 32
    assert {r["floor"] for r in rooms} == {1, 2, 3, 4, 5}
    assert all(not r["is_demo"] and r["navigation_scope"] == "unavailable" for r in rooms)
    assert all(r["navigation_node_id"] is None and r["map_position"] is None for r in rooms)
    assert client.get("/api/rooms/", params={"building_id": building.id, "search": "9228"}).json()[0]["name"] == "LAB 9228"
    entrance = rooms[0]["entrance"]
    assert entrance["destination_kind"] == "building"
    assert (entrance["latitude"], entrance["longitude"]) == (16.4756894, 102.8251242)
    assert entrance["floor_id"] is None
    assert "ซ้ายล่าง" in entrance["approach_description"]
    floors = client.get("/api/floors/", params={"building_id": building.id}).json()
    assert [f["number"] for f in floors] == [1, 2, 3, 4, 5]
    for floor in floors:
        assert floor["routing_ready"] is False and floor["meters_per_unit"] is None
        asset = client.get(floor["image_url"])
        assert asset.status_code == 200 and "data:image/png;base64," in asset.text
    assert client.get(entrance["approach_image_url"]).status_code == 200
    for room in rooms:
        detail = client.get(f'/api/rooms/{room["id"]}').json()
        assert detail["floor_id"] in {f["id"] for f in floors}


def test_repeat_import_preserves_existing_data_and_demo(db):
    demo = load_demo(db)
    sc09 = load_sc09(db)
    db.commit()
    totals = [db.query(model).count() for model in (Building, Floor, Node, Room, Connection)]
    sc09.name = "Reviewed name"
    db.commit()
    assert load_sc09(db).id == sc09.id
    assert load_sc09(db).name == "Reviewed name"
    assert [db.query(model).count() for model in (Building, Floor, Node, Room, Connection)] == totals
    assert db.query(Floor).filter_by(building_id=demo.id).count() == 3


def test_unmeasured_plan_cannot_expose_a_room_route_even_if_bound_to_a_door(client, db):
    building = load_sc09(db)
    floor = db.query(Floor).filter_by(building_id=building.id, number=1).one()
    a = Node(label="Unsurveyed door", latitude=building.latitude, longitude=building.longitude,
             floor=1, floor_id=floor.id, x=20, y=20, kind="door")
    b = Node(label="Unsurveyed corridor", latitude=building.latitude, longitude=building.longitude,
             floor=1, floor_id=floor.id, x=30, y=20, kind="walk")
    db.add_all([a, b])
    db.flush()
    db.add(Connection(from_node_id=a.id, to_node_id=b.id, weight=10))
    room = db.query(Room).filter_by(building_id=building.id, floor=1).first()
    room.node_id = a.id
    db.commit()
    assert client.get(f"/api/rooms/{room.id}").json()["navigation_scope"] == "unavailable"
    response = client.post("/api/navigate/", json={"start_node_id": a.id, "end_node_id": b.id})
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INVALID_MAP_DATA"


def test_migration_upgrades_old_plan_and_entrance_tables_and_can_repeat():
    engine = create_engine("sqlite://")
    upgrade_database(engine)
    # Simulate the two tables as they existed before this change.
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE floors DROP COLUMN routing_ready"))
        connection.execute(text("ALTER TABLE building_entrances DROP COLUMN destination_kind"))
    upgrade_database(engine)
    upgrade_database(engine)
    with Session(engine) as db:
        demo = load_demo(db)
        sc09 = load_sc09(db)
        db.commit()
        assert all(f.routing_ready for f in db.query(Floor).filter_by(building_id=demo.id))
        assert not any(f.routing_ready for f in db.query(Floor).filter_by(building_id=sc09.id))
    engine.dispose()


def test_demo_code_collision_is_not_overwritten(db):
    db.add(Building(code="SC09", name="Keep", latitude=16, longitude=102, is_demo=True))
    db.commit()
    with pytest.raises(ValueError, match="real building"):
        load_sc09(db)
