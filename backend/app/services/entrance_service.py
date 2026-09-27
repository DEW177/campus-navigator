"""Expose a designated entrance only when its graph binding is consistent."""
import math


def entrance_summary(building):
    entrance = building.entrance if building else None
    node = entrance.node if entrance else None
    if node is None or node.kind != "entrance":
        return None
    if node.floor_id is not None:
        floor = node.floor_plan
        if (floor is None or floor.building_id != building.id or floor.number != node.floor
                or node.x is None or node.y is None
                or not math.isfinite(node.x) or not math.isfinite(node.y)
                or not 0 <= node.x <= floor.width or not 0 <= node.y <= floor.height):
            return None
    lat, lon = entrance.latitude, entrance.longitude
    mapped = (lat is not None and lon is not None and math.isfinite(lat) and math.isfinite(lon)
              and -90 <= lat <= 90 and -180 <= lon <= 180)
    # The synthetic building has no world-map position even if a placeholder is
    # accidentally copied from its legacy 0,0 building coordinates.
    if building.is_demo and building.code == "DEMO":
        mapped = False
    return {"node_id": node.id, "label": node.label or f"ทางเข้า {building.name}",
            "floor_id": node.floor_id, "floor": node.floor,
            "latitude": lat if mapped else None, "longitude": lon if mapped else None}
