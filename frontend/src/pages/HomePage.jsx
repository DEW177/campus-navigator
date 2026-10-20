import React, { useEffect, useState } from "react";
import {useNavigate, useSearchParams } from "react-router-dom";
import RoomCard from "../components/RoomCard";
import BuildingPlanBrowser from "../components/BuildingPlanBrowser";
import api from "../services/api";
import "./HomePage.css";

const compareNames = (a, b) =>
  String(a).localeCompare(String(b), "th", { numeric: true });

function BuildingGroup({ building, rooms, searching, onSelectRoom }) {
  const [open, setOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

  const floors = [...new Set(rooms.map((room) => room.floor))]
    .sort((a, b) => a - b);

  const activeFloor = floors.includes(selectedFloor)
    ? selectedFloor
    : floors[0];

  const visibleRooms = searching
    ? rooms
    : rooms.filter((room) => room.floor === activeFloor);

  const expanded = searching || open;

  return (
    <article className="cn-building">
      <header className="cn-building-head">
        <span className="cn-building-icon" aria-hidden="true">
          ▥
        </span>

        <div className="cn-building-info">
          <h3>{building.name}</h3>
          <p>
            {building.code} · {rooms.length} ห้อง
            {searching ? "ที่พบ" : "ในระบบ"}

            {building.is_demo && (
              <span className="cn-badge">ข้อมูลตัวอย่าง</span>
            )}
          </p>
        </div>

        {!searching && (
          <button
            type="button"
            className="cn-outline"
            aria-expanded={expanded}
            aria-controls={`building-rooms-${building.id}`}
            onClick={() => setOpen((value) => !value)}
          >
            {expanded ? "ย่อ ↑" : "ดูห้อง ↓"}
          </button>
        )}
      </header>

      {expanded && (
        <div
          className="cn-building-content"
          id={`building-rooms-${building.id}`}
        >
          {!searching && (
            <div
              className="cn-floors"
              role="group"
              aria-label={`เลือกชั้นของ ${building.name}`}
            >
              {floors.map((floor) => (
                <button
                  key={floor}
                  type="button"
                  aria-pressed={floor === activeFloor}
                  onClick={() => setSelectedFloor(floor)}
                >
                  ชั้น {floor}
                </button>
              ))}
            </div>
          )}

          <div className="cn-rooms">
            {visibleRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onSelect={onSelectRoom}
              />
            ))}
          </div>

          {rooms.length === 0 && (
            <p>ยังไม่มีข้อมูลห้องในอาคารนี้</p>
          )}
        </div>
      )}
    </article>
  );
}

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";

  const [draft, setDraft] = useState(query);
  const [data, setData] = useState({ buildings: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    Promise.all([
      api.get("/buildings/", { signal: controller.signal }),
      api.get("/rooms/", { signal: controller.signal }),
    ])
      .then(([buildings, rooms]) => {
        if (!controller.signal.aborted) {
          setData({
            buildings: buildings.data,
            rooms: rooms.data,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("โหลดข้อมูลอาคารและห้องไม่ได้ กรุณาลองอีกครั้ง");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [attempt]);

  const search = (value) => {
    const next = value.trim();
    setDraft(next);
    setParams(next ? { q: next } : {}, { replace: true });
  };

  const selectRoom = (room) => {
    const next = new URLSearchParams({ room: String(room.id) });

    if (query) next.set("q", query);

    navigate(`/navigate?${next}`);
  };

  const keyword = query.trim().toLocaleLowerCase("th");
  const searching = Boolean(keyword);

  const groups = data.buildings
    .map((building) => {
      const buildingMatches = `${building.name} ${building.code}`
        .toLocaleLowerCase("th")
        .includes(keyword);

      const rooms = data.rooms
        .filter(
          (room) =>
            room.building_id === building.id &&
            (
              !searching ||
              buildingMatches ||
              room.name.toLocaleLowerCase("th").includes(keyword)
            )
        )
        .sort(
          (a, b) =>
            a.floor - b.floor || compareNames(a.name, b.name)
        );

      return { building, rooms };
    })
    .filter((group) => !searching || group.rooms.length > 0)
    .sort((a, b) => compareNames(a.building.code, b.building.code));

  const mainGroups = groups.filter(
    ({ building }) => building.code !== "DEMO"
  );

  const demoGroups = groups.filter(
    ({ building }) => building.code === "DEMO" && building.is_demo
  );

  const renderGroup = ({ building, rooms }) => (
    <BuildingGroup
      key={building.id}
      building={building}
      rooms={rooms}
      searching={searching}
      onSelectRoom={selectRoom}
    />
  );

  return (
    <main className="page home-page cn-home">
      <header className="home-intro">
        <p className="home-brand">↗ Campus Navigator</p>
        <h1>จะไปห้องไหน?</h1>
        <p>ค้นหาห้องที่ต้องการ หรือเลือกดูห้องตามอาคารด้านล่าง</p>
      </header>

      <form
        className="home-search cn-search"
        onSubmit={(event) => {
          event.preventDefault();
          search(draft);
        }}
      >
        <label htmlFor="room-search">ค้นหาห้องเรียนหรืออาคาร</label>

        <div className="cn-search-row">
          <input
            id="room-search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="เช่น SC06-301 หรือ อาคารเรียนรวม"
            autoComplete="off"
          />
          <button type="submit" className="cn-primary">
            ค้นหา
          </button>
        </div>

        <p className="cn-hint">
          พิมพ์แล้วกดค้นหาหรือ Enter · รู้รหัสห้องแล้วค้นหาได้เลย
        </p>
      </form>

      <section
        aria-labelledby="room-results-heading"
        aria-busy={loading}
      >
        <div className="cn-section-head">
          <h2 id="room-results-heading">
            {searching ? `ผลการค้นหา “${query}”` : "เลือกอาคาร"}
          </h2>

          {searching && (
            <button
              type="button"
              className="cn-outline"
              onClick={() => search("")}
            >
              ล้างการค้นหา
            </button>
          )}
        </div>

        {loading && <p role="status">กำลังโหลดข้อมูล...</p>}

        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="cn-outline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {mainGroups.map(renderGroup)}

            {groups.length === 0 && (
              <p role="status">
                {searching
                  ? "ไม่พบห้องหรืออาคาร ลองค้นหาด้วยชื่อหรือรหัสอื่น"
                  : "ยังไม่มีข้อมูลอาคารในระบบ"}
              </p>
            )}

            {!searching &&
              mainGroups.length === 0 &&
              demoGroups.length > 0 && (
                <p className="cn-hint">
                  ขณะนี้มีเฉพาะอาคารทดลอง เลือกทดลองใช้งานด้านล่างได้
                </p>
              )}
          </>
        )}
      </section>

      {!loading && !error && demoGroups.length > 0 && (
        <section className="cn-demo" aria-labelledby="demo-heading">
          <h2 id="demo-heading">ทดลองนำทางภายในอาคาร</h2>

          <p className="cn-hint">
            อาคาร DEMO เป็นข้อมูลจำลองสำหรับทดลองระบบ ไม่ใช่อาคารจริง
          </p>

          <BuildingPlanBrowser
            onSelectRoom={selectRoom}
            returnLabel="กลับไปค้นหาห้อง"
          />

          {demoGroups.map(renderGroup)}
        </section>
      )}

    </main>
  );
}