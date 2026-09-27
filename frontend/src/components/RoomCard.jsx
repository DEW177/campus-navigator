import React from "react";
import { hasCoordinates } from "../utils/location";

/** Displays a single room's summary info. */
export default function RoomCard({ room, onSelect }) {
  const canReachRoom = room.navigation_scope === "room" && room.navigation_node_id;
  const canReachEntrance = hasCoordinates(room.entrance);
  return (
    <article className="room-card">
      <h4>{room.name}</h4>
      <p>{room.building_name && `${room.building_name} · `}ชั้น {room.floor}</p>
      {room.is_demo && <p className="demo-badge">ข้อมูลจำลองสำหรับทดลองใช้งาน</p>}
      {!canReachRoom && canReachEntrance && <p>นำทางได้ถึงทางเข้าอาคารเท่านั้น ยังไม่มีเส้นทางถึงประตูห้อง</p>}
      {canReachRoom || canReachEntrance ? (
        <button type="button" onClick={() => onSelect?.(room)} disabled={!onSelect}>
          {canReachRoom ? "ไปห้องนี้" : "ไปทางเข้าอาคาร"}
        </button>
      ) : (
        <p>ห้องนี้ยังไม่มีข้อมูลเส้นทาง</p>
      )}
    </article>
  );
}
