import React, { useState } from "react";
import SearchBar from "../components/SearchBar";
import RoomCard from "../components/RoomCard";
import useRooms from "../hooks/useRooms";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { rooms, loading, error, retry } = useRooms(query);
  const navigate = useNavigate();

  return (
    <div className="page search-page">
      <h2>ค้นหาห้องเรียน</h2>
      <SearchBar onSearch={setQuery} />
      {loading && <p role="status">กำลังค้นหาห้อง...</p>}
      {error && <div role="alert"><p>{error}</p><button onClick={retry}>ลองอีกครั้ง</button></div>}
      {!loading && !error && rooms.length === 0 && <p>ไม่พบห้อง ลองพิมพ์ชื่อหรือรหัสห้องใหม่</p>}
      <div className="room-list">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} onSelect={(selected) => navigate(`/navigate?room=${selected.id}`)} />
        ))}
      </div>
    </div>
  );
}
