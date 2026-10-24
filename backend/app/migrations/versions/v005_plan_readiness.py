"""Keep unmeasured reference plans separate from metric routing data."""
from sqlalchemy import inspect, text


def upgrade(connection):
    additions = {
        "floors": {"routing_ready": "BOOLEAN NOT NULL DEFAULT true"},
        "building_entrances": {"destination_kind": "VARCHAR NOT NULL DEFAULT 'entrance'"},
    }
    for table, columns in additions.items():
        existing = {col["name"] for col in inspect(connection).get_columns(table)}
        for name, definition in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))
