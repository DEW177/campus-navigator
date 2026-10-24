"""Load owner-supplied SC09 reference plans, without inventing a metric graph."""
import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models import Building, Floor, Node, Room, BuildingEntrance

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "sc09.json"


def load_sc09(db: Session):
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    existing = db.query(Building).filter_by(code="SC09").first()
    if existing:
        if existing.is_demo:
            raise ValueError("SC09 is reserved for the real building, not demo data")
        # Do not overwrite future surveyed data or a user's existing records.
        return existing
    building = Building(**data["building"])
    db.add(building)
    db.flush()
    floors = {}
    for item in data["floors"]:
        # The legacy schema requires a positive numeric scale. 1 is only an
        # unused storage placeholder, never a measured scale. The API masks it
        # as null and routing is blocked while routing_ready is false.
        floor = Floor(building_id=building.id, meters_per_unit=1,
                      routing_ready=False, **item)
        db.add(floor)
        db.flush()
        floors[floor.number] = floor
    # A map destination near the building is not a surveyed indoor entrance.
    # No indoor x/y or graph edges are asserted for this point.
    destination = Node(label="จุดหมายบริเวณ SC09 อาคารวิทยวิภาส", kind="entrance",
                       floor=1, latitude=building.latitude, longitude=building.longitude,
                       landmark_description=data["approach_description"],
                       landmark_image_url=data["approach_image_url"])
    db.add(destination)
    db.flush()
    db.add(BuildingEntrance(building_id=building.id, node_id=destination.id,
                            latitude=building.latitude, longitude=building.longitude,
                            destination_kind=data["destination_kind"]))
    for item in data["rooms"]:
        db.add(Room(name=item["name"], floor=item["floor"], building_id=building.id,
                    floor_id=floors[item["floor"]].id, node_id=None))
    db.flush()
    return building


if __name__ == "__main__":
    with SessionLocal.begin() as session:
        building = load_sc09(session)
        print(f"SC09 reference plans ready: {building.code}; indoor routing pending survey")
