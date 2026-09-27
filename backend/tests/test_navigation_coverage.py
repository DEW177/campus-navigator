"""Regression tests for the actual legacy bootstrap and truthful destinations."""
from pathlib import Path
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.database.load_demo import load_demo
from app.migrations.upgrade import upgrade_database
from app.models import Building, Room, Node
from app.routes.rooms import room_summary
from app.services.navigation_service import calculate_route


@pytest.fixture
def legacy_engine():
    engine = create_engine("sqlite://")
    database = Path(__file__).resolve().parents[2] / "database"
    raw = engine.raw_connection()
    # Exercise the shipped bootstrap, translating only PostgreSQL's ID type.
    raw.executescript((database / "schema.sql").read_text().replace(
        "SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT"))
    raw.executescript((database / "seed_data.sql").read_text())
    raw.commit()
    raw.close()
    yield engine
    engine.dispose()


def test_existing_seed_is_demo_and_stops_at_entrance_even_at_zero_distance(legacy_engine):
    upgrade_database(legacy_engine)
    upgrade_database(legacy_engine)
    with Session(legacy_engine) as db:
        for room in db.query(Room).all():
            summary = room_summary(room)
            assert summary["is_demo"] is True
            assert summary["navigation_scope"] == "entrance"
            assert summary["navigation_node_id"] == room.node_id
            assert summary["navigation_label"] == f"ทางเข้า {room.building.code}"
            assert summary["map_position"] is None
        room = db.query(Room).filter_by(name="SC06-301").one()
        assert room.floor == 3 and room.node.floor == 1
        route = calculate_route(db, room.node_id, room.node_id)
        assert route.total_distance == 0 and route.is_demo
        assert db.execute(text("SELECT weight FROM connections ORDER BY id")).scalars().all() == [25, 60]
        load_demo(db)
        db.commit()
        demo = db.query(Room).filter_by(name="DEMO-301").one()
        assert room_summary(demo)["navigation_scope"] == "room"


def test_modified_building_is_not_automatically_classified_as_sample(legacy_engine):
    with legacy_engine.begin() as connection:
        connection.execute(text("UPDATE buildings SET latitude = 16.5 WHERE code = 'SC06'"))
    upgrade_database(legacy_engine)
    with Session(legacy_engine) as db:
        room = db.query(Room).filter_by(name="SC06-301").one()
        assert room.building.is_demo is False
        assert room.node.kind == "walk"
        assert room_summary(room)["navigation_scope"] == "unavailable"


def test_sample_detection_does_not_depend_on_seed_ids(legacy_engine):
    with legacy_engine.begin() as connection:
        connection.execute(text("UPDATE buildings SET id = 51 WHERE id = 1"))
        connection.execute(text("UPDATE rooms SET building_id = 51 WHERE building_id = 1"))
        connection.execute(text("UPDATE nodes SET id = 71 WHERE id = 1"))
        connection.execute(text("UPDATE rooms SET node_id = 71 WHERE node_id = 1"))
        connection.execute(text("UPDATE connections SET from_node_id = 71 WHERE from_node_id = 1"))
    upgrade_database(legacy_engine)
    with Session(legacy_engine) as db:
        assert db.get(Building, 51).is_demo
        assert db.get(Node, 71).kind == "entrance"


@pytest.mark.parametrize("change", ["building", "room_floor", "node_floor", "kind", "bounds", "missing_xy"])
def test_inconsistent_door_is_not_advertised_as_room_navigation(client, db, change):
    demo = load_demo(db)
    room = db.query(Room).filter_by(building_id=demo.id, name="DEMO-301").one()
    if change == "building":
        room.building_id = 1
    elif change == "room_floor":
        room.floor = 1
    elif change == "node_floor":
        room.node.floor = 1
    elif change == "kind":
        room.node.kind = "walk"
    elif change == "bounds":
        room.node.x = 100000
    else:
        room.node.x = None
    db.commit()
    summary = client.get(f"/api/rooms/{room.id}").json()
    assert summary["navigation_scope"] == "unavailable"
    assert summary["navigation_node_id"] is None
    assert summary["map_position"] is None


def test_unverified_legacy_node_does_not_imply_a_room_destination(client):
    summary = client.get("/api/rooms/10").json()
    assert summary["node_id"] == 3  # compatibility field is not a coverage claim
    assert summary["navigation_scope"] == "unavailable"
    assert summary["navigation_node_id"] is None
