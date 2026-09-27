"""Run from backend: python -m app.migrations.upgrade (safe to repeat)."""
from app.database.database import engine
from app.migrations.versions.v001_indoor import upgrade


def upgrade_database(target_engine=engine):
    with target_engine.begin() as connection:
        upgrade(connection)


if __name__ == "__main__":
    upgrade_database()
    print("Indoor schema ready; existing records preserved.")
