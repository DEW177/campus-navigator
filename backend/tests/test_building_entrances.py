import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.database.load_demo import load_demo
from app.migrations.upgrade import upgrade_database
from app.models import Building, BuildingEntrance, Node, Room
from app.routes.rooms import room_summary
from .test_navigation_coverage import legacy_engine  # reuse the actual shipped SQL bootstrap


def test_existing_outdoor_samples_gain_explicit_repeatable_entrances(legacy_engine):
    upgrade_database(legacy_engine)
    upgrade_database(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.query(BuildingEntrance).count() == 2
        for room in db.query(Room):
            entrance = room_summary(room)["entrance"]
            assert entrance["node_id"] == room.node_id
            assert entrance["floor_id"] is None
            assert entrance["latitude"] == room.node.latitude
            assert entrance["longitude"] == room.node.longitude
        # User edits to a binding are deliberately preserved on the next boot.
        entry = db.query(BuildingEntrance).first()
        entry.latitude = None
        db.commit()
    upgrade_database(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.query(BuildingEntrance).first().latitude is None


def test_old_indoor_demo_gets_the_known_entry_without_changing_routes():
    engine = create_engine("sqlite://")
    upgrade_database(engine)
    with Session(engine) as db:
        demo = load_demo(db)
        db.commit()
        entry = db.get(BuildingEntrance, demo.id)
        entry_id = entry.node_id
        entry.node.kind = "walk"
        db.delete(entry)
        db.commit()
        count = db.query(Node).count()
    upgrade_database(engine)
    upgrade_database(engine)
    with Session(engine) as db:
        entry = db.query(BuildingEntrance).one()
        assert entry.node_id == entry_id and entry.node.kind == "entrance"
        assert entry.latitude is None and entry.longitude is None
        assert db.query(Node).count() == count
        assert db.execute(text("SELECT COUNT(*) FROM connections")).scalar() > 0
    engine.dispose()


def test_demo_room_has_automatic_start_but_no_real_world_destination(client, db):
    demo = load_demo(db)
    db.commit()
    room = db.query(Room).filter_by(name="DEMO-301").one()
    data = client.get(f"/api/rooms/{room.id}").json()
    entry = data["entrance"]
    assert entry["floor"] == 1 and entry["label"] == "ทางเข้าอาคารทดลอง"
    assert entry["latitude"] is None and entry["longitude"] is None
    result = client.post("/api/navigate/", json={"start_node_id": entry["node_id"],
        "end_node_id": data["navigation_node_id"], "route_mode": "stairs"})
    assert result.json()["total_distance"] == pytest.approx(36.5)
    # Defend against copying synthetic building coordinates into the new binding.
    mapping = db.get(BuildingEntrance, demo.id)
    mapping.latitude = mapping.longitude = 0
    db.commit()
    assert client.get(f"/api/rooms/{room.id}").json()["entrance"]["latitude"] is None


def test_real_building_uses_surveyed_entrance_and_not_its_centre(client, db):
    demo = load_demo(db)
    demo.code, demo.is_demo = "SURVEY", False
    demo.latitude, demo.longitude = 16.4, 102.8
    entry = db.get(BuildingEntrance, demo.id)
    entry.latitude, entry.longitude = 16.4735, 102.8236
    db.commit()
    room = db.query(Room).filter_by(building_id=demo.id).first()
    data = client.get(f"/api/rooms/{room.id}").json()
    assert data["entrance"]["latitude"] == 16.4735
    assert data["entrance"]["longitude"] == 102.8236
    assert data["is_demo"] is False


@pytest.mark.parametrize("change", ["wrong_building", "not_entrance", "out_of_bounds", "floor_mismatch"])
def test_invalid_indoor_entry_is_not_used_as_automatic_start(client, db, change):
    demo = load_demo(db)
    entry = db.get(BuildingEntrance, demo.id)
    if change == "wrong_building":
        entry.node.floor_plan.building_id = 1
    elif change == "not_entrance":
        entry.node.kind = "walk"
    elif change == "out_of_bounds":
        entry.node.x = -1
    else:
        entry.node.floor = 999
    db.commit()
    room = db.query(Room).filter_by(building_id=demo.id).first()
    assert client.get(f"/api/rooms/{room.id}").json()["entrance"] is None


def test_missing_entry_is_not_guessed_from_the_first_or_nearest_node(client, db):
    assert client.get("/api/rooms/10").json()["entrance"] is None
    assert db.query(Building).count() == 1


@pytest.mark.parametrize("lat,lon", [(None, 102), (91, 102), (16, 181), (float("inf"), 102)])
def test_invalid_world_coordinates_preserve_indoor_plan_only(client, db, lat, lon):
    demo = load_demo(db)
    demo.code, demo.is_demo = "SURVEY", False
    entry = db.get(BuildingEntrance, demo.id)
    entry.latitude, entry.longitude = lat, lon
    db.commit()
    room = db.query(Room).filter_by(building_id=demo.id).first()
    result = client.get(f"/api/rooms/{room.id}").json()["entrance"]
    assert result["node_id"] == entry.node_id
    assert result["latitude"] is None and result["longitude"] is None
