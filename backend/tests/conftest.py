"""Isolated database fixtures; never connect to the application's database."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.models.node import Node
from app.models.connection import Connection
from app.models.building import Building
from app.models.room import Room
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import get_db


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as session:
        # The direct edge costs 20; the shorter route is 1 -> 2 -> 3 (12).
        # Node 4 exists but is disconnected from the others.
        session.add_all([
            Node(id=i, label=f"Node {i}", latitude=16.0 + i / 1000,
                 longitude=102.0, floor=1)
            for i in range(1, 5)
        ])
        session.flush()
        session.add_all([
            Connection(from_node_id=1, to_node_id=3, weight=20),
            Connection(from_node_id=1, to_node_id=2, weight=5),
            Connection(from_node_id=2, to_node_id=3, weight=7),
        ])
        session.add(Building(id=1, name="Computing", code="SC06", latitude=16.0, longitude=102.0))
        session.flush()
        session.add_all([
            Room(id=10, name="SC06-301", floor=3, building_id=1, node_id=3),
            Room(id=11, name="SC06-302", floor=3, building_id=1, node_id=None),
        ])
        session.commit()
        yield session
    engine.dispose()


@pytest.fixture
def client(db):
    def override_db():
        yield db

    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
