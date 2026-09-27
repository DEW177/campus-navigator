import React from "react";

/** Displays a single room's summary info. */
export default function RoomCard({ room, onSelect }) {
  return (
    <div className="room-card" onClick={() => onSelect?.(room)}>
      <h4>{room.name}</h4>
      <p>ชั้น {room.floor}</p>
    </div>
  );
}
