import React from "react";

/** Displays a single room's summary info. */
export default function RoomCard({ room, onSelect }) {
  return (
    <article className="room-card">
      <h4>{room.name}</h4>
      <p>{room.building_name && `${room.building_name} · `}ชั้น {room.floor}</p>
      {room.is_demo && <p className="demo-badge">ข้อมูลจำลองสำหรับทดลองใช้งาน</p>}
      {room.node_id ? (
        <button type="button" onClick={() => onSelect?.(room)} disabled={!onSelect}>
          ไปห้องนี้
        </button>
      ) : (
        <p>ห้องนี้ยังไม่มีข้อมูลเส้นทาง</p>
      )}
    </article>
  );
}
