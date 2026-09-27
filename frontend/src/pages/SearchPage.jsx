import React, { useState } from "react";
import SearchBar from "../components/SearchBar";
import RoomCard from "../components/RoomCard";
import useRooms from "../hooks/useRooms";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { rooms, loading } = useRooms(query);

  return (
    <div className="page search-page">
      <h2>ค้นหาห้องเรียน</h2>
      <SearchBar onSearch={setQuery} />
      {loading && <p>กำลังโหลด...</p>}
      <div className="room-list">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}
