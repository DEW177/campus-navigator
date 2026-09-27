"""Import the versioned demonstration data. Safe to repeat; never replaces records."""
import json
import math
from pathlib import Path
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import Building, Floor, Node, Room, Connection

DEMO_FILE = Path(__file__).resolve().parents[2] / "data" / "indoor_demo.json"


def validate_data(data):
    floors = {f["key"]: f for f in data["floors"]}
    nodes = {n["key"]: n for n in data["nodes"]}
    if len(floors) != len(data["floors"]) or len(nodes) != len(data["nodes"]):
        raise ValueError("Duplicate floor/node keys")
    if data["building"]["code"] != "DEMO" or data["building"]["is_demo"] is not True:
        raise ValueError("This importer only accepts the explicitly marked DEMO building")
    for f in floors.values():
        if not all(math.isfinite(f[k]) and f[k] > 0 for k in ("width", "height", "meters_per_unit")):
            raise ValueError("Invalid floor dimensions/scale")
    for n in nodes.values():
        f = floors[n["floor"]]
        if not (math.isfinite(n["x"]) and math.isfinite(n["y"]) and 0 <= n["x"] <= f["width"] and 0 <= n["y"] <= f["height"]):
            raise ValueError("Node is outside its floor plan")
    pairs = set()
    for e in data["connections"]:
        a, b = nodes[e["source"]], nodes[e["target"]]
        pair = tuple(sorted([e["source"], e["target"]]))
        if pair in pairs or pair[0] == pair[1]:
            raise ValueError("Duplicate edge or self-loop")
        pairs.add(pair)
        if a["floor"] != b["floor"]:
            if e["kind"] not in ("stairs", "elevator") or a["kind"] != e["kind"] or b["kind"] != e["kind"]:
                raise ValueError("Cross-floor edge must connect matching stairs/elevators")
            if not math.isfinite(e["weight"]) or e["weight"] <= 0:
                raise ValueError("Invalid vertical distance")
        elif e["kind"] != "walk":
            raise ValueError("Same-floor edges must be walk edges")
    for room in data["rooms"]:
        if nodes[room["node"]]["kind"] != "door":
            raise ValueError("Rooms must connect to their door node")


def load_demo(db: Session, data=None):
    data = data if data is not None else json.loads(DEMO_FILE.read_text(encoding="utf-8"))
    validate_data(data)
    existing = db.query(Building).filter_by(code="DEMO").first()
    if existing:
        if not existing.is_demo:
            raise ValueError("Building code DEMO is already used by non-demo data")
        return existing
    building = Building(**data["building"])
    db.add(building)
    db.flush()
    floors, nodes, scale_by_floor = {}, {}, {}
    for item in data["floors"]:
        floor = Floor(building_id=building.id, **{k: v for k, v in item.items() if k != "key"})
        db.add(floor)
        db.flush()
        floors[item["key"]] = floor
        scale_by_floor[floor.id] = floor.meters_per_unit
    for item in data["nodes"]:
        floor = floors[item["floor"]]
        node = Node(floor_id=floor.id, floor=floor.number,
                    latitude=building.latitude, longitude=building.longitude,
                    **{k: v for k, v in item.items() if k not in ("key", "floor")})
        db.add(node)
        db.flush()
        nodes[item["key"]] = node
    for item in data["connections"]:
        a, b = nodes[item["source"]], nodes[item["target"]]
        weight = item.get("weight")
        if a.floor_id == b.floor_id:
            weight = math.hypot(a.x - b.x, a.y - b.y) * scale_by_floor[a.floor_id]
        db.add(Connection(from_node_id=a.id, to_node_id=b.id, weight=weight, kind=item["kind"]))
    for item in data["rooms"]:
        node = nodes[item["node"]]
        db.add(Room(name=item["name"], building_id=building.id, floor=node.floor, floor_id=node.floor_id, node_id=node.id))
    db.flush()
    return building


if __name__ == "__main__":
    with SessionLocal.begin() as session:
        building = load_demo(session)
        print(f"Demo building ready: {building.code}")
