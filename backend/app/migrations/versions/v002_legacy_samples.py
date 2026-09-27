"""Identify unchanged legacy sample rooms without relabeling surveyed buildings.

These rooms point at an outdoor entrance, not a classroom door. Match the seed's
content rather than database IDs, and skip buildings with added rooms or plans.
Safe to repeat; no room, graph edge, or coordinate is rewritten.
"""
from sqlalchemy import text

SAMPLES = (
    ("SC06", "อาคารวิทยาลัยการคอมพิวเตอร์", "SC06-301", 3, 16.4735, 102.8236),
    ("RC01", "อาคารเรียนรวม", "RC01-101", 1, 16.4728, 102.8241),
)


def upgrade(connection):
    for code, name, room, floor, lat, lon in SAMPLES:
        matches = connection.execute(text("""
            SELECT b.id AS building_id, n.id AS node_id
            FROM buildings b JOIN rooms r ON r.building_id = b.id
            JOIN nodes n ON n.id = r.node_id
            WHERE b.code = :code AND b.name = :name
              AND r.name = :room AND r.floor = :floor AND r.floor_id IS NULL
              AND n.label = :label AND n.floor = 1 AND n.floor_id IS NULL
              AND n.kind IN ('walk', 'entrance') AND n.x IS NULL AND n.y IS NULL
              AND ABS(b.latitude - :lat) < 0.0000001 AND ABS(b.longitude - :lon) < 0.0000001
              AND ABS(n.latitude - :lat) < 0.0000001 AND ABS(n.longitude - :lon) < 0.0000001
              AND NOT EXISTS (SELECT 1 FROM floors f WHERE f.building_id = b.id)
              AND (SELECT COUNT(*) FROM rooms other WHERE other.building_id = b.id) = 1
        """), {"code": code, "name": name, "room": room, "floor": floor,
               "label": f"ทางเข้า {code}", "lat": lat, "lon": lon}).mappings().all()
        for match in matches:
            connection.execute(text("UPDATE buildings SET is_demo = true WHERE id = :id"),
                               {"id": match["building_id"]})
            connection.execute(text("UPDATE nodes SET kind = 'entrance' WHERE id = :id"),
                               {"id": match["node_id"]})
