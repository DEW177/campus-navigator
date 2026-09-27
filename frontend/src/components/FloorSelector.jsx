import React from "react";

export default function FloorSelector({ floors, value, onChange, routeFloorIds = [] }) {
  return (
    <div className="floor-selector" role="group" aria-label="เลือกชั้นที่ต้องการดู">
      {floors.map((floor) => (
        <button key={floor.id} type="button" aria-pressed={floor.id === value} onClick={() => onChange(floor.id)}>
          {floor.name}{routeFloorIds.includes(floor.id) && <span className="floor-route-hint"> · มีเส้นทาง</span>}
        </button>
      ))}
    </div>
  );
}
