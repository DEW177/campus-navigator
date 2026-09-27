"""Add indoor data without deleting or rewriting legacy graph records."""
from sqlalchemy import inspect, text
from app.database.database import Base
import app.models  # register every table, including Floor

ADDITIONS = {
    "buildings": {"is_demo": "BOOLEAN NOT NULL DEFAULT false"},
    "nodes": {
        "floor_id": "INTEGER REFERENCES floors(id)", "x": "DOUBLE PRECISION",
        "y": "DOUBLE PRECISION", "kind": "VARCHAR NOT NULL DEFAULT 'walk'",
        "landmark_description": "VARCHAR", "landmark_image_url": "VARCHAR",
    },
    "rooms": {"floor_id": "INTEGER REFERENCES floors(id)"},
    "connections": {
        "kind": "VARCHAR NOT NULL DEFAULT 'walk'",
        "is_active": "BOOLEAN NOT NULL DEFAULT true",
        "bidirectional": "BOOLEAN NOT NULL DEFAULT true",
    },
}


def upgrade(connection):
    Base.metadata.create_all(connection)
    for table, columns in ADDITIONS.items():
        existing = {col["name"] for col in inspect(connection).get_columns(table)}
        for name, definition in columns.items():
            if name not in existing:
                # Identifiers and types are fixed migration constants, never user input.
                connection.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {definition}'))
