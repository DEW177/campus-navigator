import React from "react";

/** Displays a single room's summary info. */
export default function RoomCard({ room, onSelect }) {
  return (
    <article className="room-card">
      <h4>{room.name}</h4>
      <p>{room.building_name && `${room.building_name} · `}ชั้น {room.floor}</p>
      {room.is_demo && <p className="demo-badge">ข้อมูลจำลองสำหรับทดลองใช้งาน</p>}
      {room.navigation_scope === "entrance" && <p>นำทางได้ถึงทางเข้าอาคารเท่านั้น ยังไม่มีเส้นทางถึงประตูห้อง</p>}
      {room.navigation_node_id ? (
        <button type="button" onClick={() => onSelect?.(room)} disabled={!onSelect}>
          {room.navigation_scope === "entrance" ? "ไปทางเข้าอาคาร" : "ไปห้องนี้"}
        </button>
      ) : (
        <p>ห้องนี้ยังไม่มีข้อมูลเส้นทาง</p>
      )}
    </article>
  );
}
