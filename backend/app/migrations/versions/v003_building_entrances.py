"""Add explicit entrance bindings; never guess a real building's entrance."""
from sqlalchemy import text
from app.models import BuildingEntrance


def upgrade(connection):
    BuildingEntrance.__table__.create(connection, checkfirst=True)
    # v002 has already identified the original outdoor sample records. Preserve
    # any existing mapping, including an intentionally changed/null coordinate.
    connection.execute(text("""
        INSERT INTO building_entrances (building_id, node_id, latitude, longitude)
        SELECT b.id, n.id, n.latitude, n.longitude
        FROM buildings b JOIN rooms r ON r.building_id = b.id
        JOIN nodes n ON n.id = r.node_id
        WHERE b.is_demo = true AND b.code IN ('SC06', 'RC01')
          AND r.name = b.code || CASE WHEN b.code = 'SC06' THEN '-301' ELSE '-101' END
          AND r.floor_id IS NULL AND n.floor_id IS NULL AND n.kind = 'entrance'
          AND n.label = 'ทางเข้า ' || b.code
          AND (SELECT COUNT(*) FROM rooms other WHERE other.building_id = b.id) = 1
          AND NOT EXISTS (SELECT 1 FROM floors f WHERE f.building_id = b.id)
          AND NOT EXISTS (SELECT 1 FROM building_entrances e WHERE e.building_id = b.id)
    """))
    # Existing indoor demo databases predate the explicit entrance kind/binding.
    # Match its versioned entry point, never the first/nearest arbitrary node.
    matches = connection.execute(text("""
        SELECT b.id AS building_id, n.id AS node_id
        FROM buildings b JOIN floors f ON f.building_id = b.id
        JOIN nodes n ON n.floor_id = f.id
        WHERE b.code = 'DEMO' AND b.is_demo = true AND f.number = 1
          AND n.floor = 1 AND n.label = 'ทางเข้าอาคารทดลอง' AND n.x = 80 AND n.y = 300
          AND n.kind IN ('walk', 'entrance')
          AND NOT EXISTS (SELECT 1 FROM building_entrances e WHERE e.building_id = b.id)
    """)).mappings().all()
    # Ambiguous entry records must be corrected by the data owner, not guessed.
    if len(matches) == 1:
        match = matches[0]
        connection.execute(text("UPDATE nodes SET kind = 'entrance' WHERE id = :node_id"), match)
        connection.execute(text("""
            INSERT INTO building_entrances (building_id, node_id, latitude, longitude)
            VALUES (:building_id, :node_id, NULL, NULL)
        """), match)
