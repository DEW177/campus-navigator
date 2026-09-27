from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from app.migrations.upgrade import upgrade_database
from app.database.load_demo import load_demo
from app.models import Building, Floor


def test_upgrade_existing_database_preserves_rows_and_can_repeat():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE buildings (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, code VARCHAR UNIQUE, latitude FLOAT NOT NULL, longitude FLOAT NOT NULL)"))
        connection.execute(text("CREATE TABLE nodes (id INTEGER PRIMARY KEY, label VARCHAR, latitude FLOAT NOT NULL, longitude FLOAT NOT NULL, floor INTEGER)"))
        connection.execute(text("CREATE TABLE rooms (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, floor INTEGER, building_id INTEGER, node_id INTEGER)"))
        connection.execute(text("CREATE TABLE connections (id INTEGER PRIMARY KEY, from_node_id INTEGER, to_node_id INTEGER, weight FLOAT NOT NULL)"))
        connection.execute(text("INSERT INTO buildings VALUES (1, 'Keep me', 'REAL', 16, 102)"))
        connection.execute(text("INSERT INTO nodes VALUES (1, 'Existing entrance', 16, 102, 1)"))
        connection.execute(text("INSERT INTO rooms VALUES (1, 'Existing room', 1, 1, 1)"))
        connection.execute(text("INSERT INTO connections VALUES (1, 1, 1, 0)"))
    upgrade_database(engine)
    upgrade_database(engine)
    with Session(engine) as db:
        load_demo(db)
        db.commit()
        assert db.get(Building, 1).name == "Keep me"
        assert db.get(Building, 1).is_demo is False
        assert db.query(Floor).count() == 3
        assert db.execute(text("SELECT kind, is_active, bidirectional FROM connections WHERE id=1")).one() == ("walk", 1, 1)
        assert db.execute(text("SELECT name, floor_id FROM rooms WHERE id=1")).one() == ("Existing room", None)
    assert "floor_id" in {c["name"] for c in inspect(engine).get_columns("nodes")}
    engine.dispose()


def test_upgrade_fresh_database_can_seed_demo():
    engine = create_engine("sqlite://")
    upgrade_database(engine)
    with Session(engine) as db:
        assert load_demo(db).is_demo
        db.commit()
        assert db.query(Floor).count() == 3
    engine.dispose()
