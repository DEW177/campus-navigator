import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import RoomCard from "../components/RoomCard";
import BuildingPlanBrowser from "../components/BuildingPlanBrowser";
import useRooms from "../hooks/useRooms";

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const { rooms, loading, error, retry } = useRooms(query);
  const navigate = useNavigate();

  const search = (value) => {
    // Replace typing history so Back returns to the previous page, not every letter.
    setParams(value ? { q: value } : {}, { replace: true });
  };
  const selectRoom = (room) => {
    const next = new URLSearchParams({ room: String(room.id) });
    if (query) next.set("q", query);
    navigate(`/navigate?${next}`);
  };

  return (
    <main className="page home-page">
      <header className="home-intro">
        <p className="home-brand">Campus Navigator</p>
        <h1>จะไปห้องไหน?</h1>
        <p>พิมพ์ชื่อหรือรหัสห้อง แล้วเลือกห้องที่ต้องการไป</p>
      </header>
      <div className="home-search">
        <label htmlFor="room-search">ค้นหาห้องเรียน</label>
        <SearchBar id="room-search" value={query} onSearch={search} />
      </div>
      <BuildingPlanBrowser onSelectRoom={selectRoom} returnLabel="กลับไปค้นหาห้อง" />
      <section aria-labelledby="room-results-heading" aria-busy={loading}>
        <h2 id="room-results-heading">{query.trim() ? "ผลการค้นหา" : "เลือกห้องจากรายการ"}</h2>
        {loading && <p role="status">กำลังค้นหาห้อง...</p>}
        {error && <div role="alert"><p>{error}</p><button onClick={retry}>ลองอีกครั้ง</button></div>}
        {!loading && !error && rooms.length === 0 && (
          <div role="status">
            <p>{query.trim() ? "ไม่พบห้อง ลองพิมพ์ชื่อหรือรหัสห้องใหม่" : "ยังไม่มีห้องในระบบ"}</p>
            {query && <button onClick={() => search("")}>ดูห้องทั้งหมด</button>}
          </div>
        )}
        <div className="room-list">
          {rooms.map((room) => <RoomCard key={room.id} room={room} onSelect={selectRoom} />)}
        </div>
      </section>
      <footer className="home-footer"><Link to="/schedule">ดูตารางเรียน</Link></footer>
    </main>
  );
}
