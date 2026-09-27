import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import FloorMap from "../components/FloorMap";
import FloorSelector from "../components/FloorSelector";
import DirectionSteps from "../components/DirectionSteps";
import BuildingPlanBrowser from "../components/BuildingPlanBrowser";
import OutdoorNavigation from "../components/OutdoorNavigation";
import useNavigation from "../hooks/useNavigation";
import api from "../services/api";
import { getFloors } from "../services/mapService";

export default function NavigationPage() {
  const goTo = useNavigate();
  const [params, setParams] = useSearchParams();
  const roomId = params.get("room");
  const searchQuery = params.get("q");
  const searchUrl = searchQuery ? `/?${new URLSearchParams({ q: searchQuery })}` : "/";
  const validRoomId = /^[1-9]\d*$/.test(roomId || "") && Number.isSafeInteger(Number(roomId));
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [routeAttempt, setRouteAttempt] = useState(0);
  const [fitRequest, setFitRequest] = useState(0);
  const [floors, setFloors] = useState([]);
  const savedMode = params.get("mode") || "shortest";
  const validMode = ["shortest", "stairs", "elevator"].includes(savedMode);
  const routeMode = validMode ? savedMode : "shortest";
  // Old manual-start links must not silently become routes from another point.
  const routeRequested = params.get("route") === "1" && !params.has("start");
  const { path, distance, route, loading: routing, error, navigate, reset } = useNavigation();
  const indoor = room?.floor_id != null;
  const entrance = room?.entrance;
  const canRouteIndoors = indoor && room?.navigation_scope === "room"
    && room?.navigation_node_id != null && entrance?.floor_id != null && entrance?.node_id != null;
  const selectedFloorId = floors.find((floor) => String(floor.id) === params.get("floor"))?.id
    ?? route?.segments?.[0]?.floor_id ?? room?.floor_id ?? null;
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId);
  const updateChoices = (changes) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    if (previous.has("start") && changes.route !== "1") next.delete("route");
    next.delete("start");
    Object.entries(changes).forEach(([key, value]) => {
      if (value == null || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    return next;
  }, { replace: true });
  const selectFloor = (floorId) => updateChoices({ floor: floorId });

  useEffect(() => {
    const controller = new AbortController();
    setRoom(null);
    setFloors([]);
    setLoadError("");
    reset();
    if (!validRoomId) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const load = async () => {
      const selectedRoom = (await api.get(`/rooms/${roomId}`, { signal: controller.signal })).data;
      if (controller.signal.aborted) return;
      if (!selectedRoom) {
        setLoadError("ไม่พบห้องที่เลือก กรุณาค้นหาห้องใหม่");
        return;
      }
      const roomFloors = selectedRoom.floor_id != null
        ? await getFloors(selectedRoom.building_id, controller.signal) : [];
      if (controller.signal.aborted) return;
      setRoom(selectedRoom);
      setFloors(roomFloors);
    };
    load().catch((err) => {
      if (controller.signal.aborted) return;
      setLoadError(err.response?.status === 404
        ? "ไม่พบห้องที่เลือก กรุณาค้นหาห้องใหม่"
        : "โหลดข้อมูลสำหรับนำทางไม่ได้ กรุณาลองอีกครั้ง");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [roomId, validRoomId, attempt, reset]);

  // Restore only the entrance-to-room plan. Device coordinates are neither
  // persisted nor restored, and refresh never triggers a geolocation prompt.
  useEffect(() => {
    if (!loading && room?.id === Number(roomId) && canRouteIndoors && routeRequested && validMode) {
      navigate(room.entrance.node_id, room.navigation_node_id, routeMode);
    }
    return reset;
  }, [loading, room, roomId, canRouteIndoors, routeRequested, validMode, routeMode,
      routeAttempt, navigate, reset]);

  const handleGo = (event) => {
    event.preventDefault();
    if (!routing && canRouteIndoors) {
      updateChoices({ route: "1", mode: routeMode, floor: null });
      setRouteAttempt((value) => value + 1);
    }
  };

  return (
    <main className="page navigation-page">
      <h2>นำทางไปห้องเรียน</h2>
      <Link to={searchUrl}>เลือกห้องอื่น</Link>
      {!validRoomId && <p>กรุณาค้นหาและเลือกห้องที่ต้องการไปก่อน</p>}
      {loading && <p role="status">กำลังโหลดข้อมูลห้อง...</p>}
      {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => setAttempt((n) => n + 1)}>ลองอีกครั้ง</button></div>}
      {!loading && room && <>
        <h3>ปลายทาง: {room.name}</h3>
        <p>{room.building_name && `${room.building_name} · `}ชั้น {room.floor}</p>
        {room.is_demo && <aside className="demo-notice" aria-label="ข้อมูลจำลอง">
          <strong>โหมดทดลอง — ข้อมูลตัวอย่าง</strong>
          <p>ห้อง แผนผัง จุดสังเกต และระยะทางเป็นข้อมูลจำลอง สำหรับทดลองระบบเท่านั้น</p>
        </aside>}
        {room.navigation_scope === "entrance" && <aside className="demo-notice" aria-label="ขอบเขตการนำทาง">
          <strong>นำทางได้ถึงทางเข้าอาคารเท่านั้น</strong>
          <p>ยังไม่มีเส้นทางภายในอาคารไปถึงประตูห้อง {room.name} ชั้น {room.floor}</p>
        </aside>}
        <OutdoorNavigation key={room.id} buildingId={room.building_id} entrance={entrance} isDemo={room.is_demo} hasIndoorRoute={canRouteIndoors} />
        <BuildingPlanBrowser key={`plan-${room.id}`} destination={room} onSelectRoom={(selected) => {
          const next = new URLSearchParams({ room: String(selected.id) });
          if (searchQuery) next.set("q", searchQuery);
          goTo(`/navigate?${next}`);
        }} />
        {indoor && <section aria-labelledby="indoor-heading">
          <h3 id="indoor-heading">จากทางเข้าไปห้องเรียน</h3>
          {canRouteIndoors ? <>
            <p>เริ่มเส้นทางในผังที่ {entrance.label} · ชั้น {entrance.floor} ระบบไม่ได้ระบุว่าคุณอยู่ที่จุดนี้แล้ว</p>
            <form onSubmit={handleGo}>
              <div className="route-mode-picker">
                <label htmlFor="route-mode">ขึ้นลงชั้นด้วยอะไร?</label>
                <select id="route-mode" value={routeMode} onChange={(event) => {
                  reset();
                  updateChoices({ mode: event.target.value, route: null, floor: null });
                }}>
                  <option value="shortest">เลือกเส้นทางสั้นที่สุด</option>
                  <option value="stairs">ใช้บันได</option>
                  <option value="elevator">ใช้ลิฟต์</option>
                </select>
              </div>
              <button type="submit" disabled={routing}>
                {routing ? "กำลังคำนวณ..." : room.is_demo ? "ทดลองเส้นทางจากทางเข้า" : "ดูเส้นทางจากทางเข้าไปห้อง"}
              </button>
            </form>
          </> : <p role="status">ยังไม่มีข้อมูลทางเข้าที่เชื่อมไปห้องนี้ คุณยังดูผังชั้นได้</p>}
          {routeRequested && !validMode && <p role="alert">ตัวเลือกเส้นทางเดิมไม่ถูกต้อง กรุณาเลือกวิธีขึ้นลงชั้นแล้วคำนวณใหม่</p>}
          {routing && <p role="status">กำลังคำนวณเส้นทาง...</p>}
          {error && <p role="alert">{error}</p>}
          {distance !== null && <p role="status">{room.is_demo ? "ระยะทางจำลองในอาคาร" : "ระยะทางในอาคาร"}: {distance.toFixed(1)} เมตร</p>}
          {path.length > 0 && <div className="route-summary">
            <p>จาก: {entrance.label} → ประตูห้อง {room.name}</p>
            <p>เส้นทางเริ่มที่ทางเข้าอาคาร และไม่ได้ติดตามตำแหน่งขณะเดิน</p>
            <button type="button" onClick={() => setFitRequest((value) => value + 1)}>ดูเส้นทางในชั้นนี้</button>
          </div>}
          <h3>แผนผัง{selectedFloor?.name || `ชั้น ${room.floor}`}</h3>
          <FloorSelector floors={floors} value={selectedFloorId} onChange={selectFloor}
            routeFloorIds={(route?.segments || []).map((segment) => segment.floor_id)} />
          {selectedFloor ? <FloorMap floor={selectedFloor} route={route} fitRequest={fitRequest} />
            : <p role="status">ยังไม่มีแผนผังสำหรับชั้นนี้</p>}
          {path.length > 0 && !route?.segments?.some((segment) => segment.floor_id === selectedFloorId)
            && <p>เส้นทางนี้ไม่ผ่านชั้นที่กำลังดู กดชั้นที่ระบุว่ามีเส้นทาง</p>}
          <DirectionSteps steps={route?.directions || []} onSelectFloor={(floorId) => {
            selectFloor(floorId);
            document.querySelector(".floor-selector")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
          }} />
        </section>}
        {!indoor && !entrance && <p role="status">ห้องนี้ยังไม่มีข้อมูลเส้นทาง กรุณาเลือกห้องอื่นหรือดูผังอาคารทดลอง</p>}
      </>}
    </main>
  );
}
