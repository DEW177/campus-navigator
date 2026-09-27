"""Isolated database fixtures; never connect to the application's database."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.database import Base
from app.models.node import Node
from app.models.connection import Connection


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine, tables=[Node.__table__, Connection.__table__])
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
        session.commit()
        yield session
    engine.dispose()
