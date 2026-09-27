"""Run from backend: python -m app.migrations.upgrade (safe to repeat)."""
from app.database.database import engine
from app.migrations.versions import v001_indoor, v002_legacy_samples, v003_building_entrances


def upgrade_database(target_engine=engine):
    with target_engine.begin() as connection:
        v001_indoor.upgrade(connection)
        v002_legacy_samples.upgrade(connection)
        v003_building_entrances.upgrade(connection)


if __name__ == "__main__":
    upgrade_database()
    print("Schema ready; original outdoor samples labeled as demo entrances. Existing records preserved.")
