"""Instructions refer to landmarks, without assuming the user's compass heading."""
from app.schemas.navigation_schema import DirectionStep


def build_directions(path, edges, floor_by_id):
    first = path[0]
    steps = [DirectionStep(kind="start", text=f"เริ่มที่ {first.label or 'จุดเริ่มต้น'}", floor_id=first.floor_id)]
    distance = 0.0
    for a, b in zip(path, path[1:]):
        edge = edges[(a.id, b.id)]
        if a.floor_id != b.floor_id:
            source, target = floor_by_id[a.floor_id], floor_by_id[b.floor_id]
            verb = "ขึ้น" if target.number > source.number else "ลง"
            method = "บันได" if edge.kind == "stairs" else "ลิฟต์"
            steps.append(DirectionStep(kind=edge.kind, floor_id=a.floor_id, target_floor_id=b.floor_id,
                text=f"{verb}{method}จาก{source.name} ไป{target.name}",
                landmark_description=a.landmark_description, image_url=a.landmark_image_url))
            distance = 0.0
        else:
            distance += edge.weight
            if b.label or b is path[-1]:
                steps.append(DirectionStep(kind="walk", floor_id=b.floor_id,
                    text=f"เดินตามทางเดิน {distance:.1f} เมตร ไปยัง {b.label or 'จุดหมาย'}",
                    landmark_description=b.landmark_description, image_url=b.landmark_image_url))
                distance = 0.0
    steps.append(DirectionStep(kind="arrive", text=f"ถึง {path[-1].label or 'จุดหมาย'}", floor_id=path[-1].floor_id))
    return steps
