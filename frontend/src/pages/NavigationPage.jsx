import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CampusMap from "../components/CampusMap";
import RoutePolyline from "../components/RoutePolyline";
import FloorMap from "../components/FloorMap";
import FloorSelector from "../components/FloorSelector";
import DirectionSteps from "../components/DirectionSteps";
import BuildingPlanBrowser from "../components/BuildingPlanBrowser";
import StartLocationPicker from "../components/StartLocationPicker";
import useNavigation from "../hooks/useNavigation";
import api from "../services/api";
import { getStartLocations, getFloors } from "../services/mapService";

export default function NavigationPage() {
  const goTo = useNavigate();
  const [params, setParams] = useSearchParams();
  const roomId = params.get("room");
  const searchQuery = params.get("q");
  const searchUrl = searchQuery ? `/?${new URLSearchParams({ q: searchQuery })}` : "/";
  const validRoomId = /^[1-9]\d*$/.test(roomId || "") && Number.isSafeInteger(Number(roomId));
  const [room, setRoom] = useState(null);
  const [locations, setLocations] = useState([]);
  const startId = params.get("start") || "";
  const validStartId = /^[1-9]\d*$/.test(startId) && Number.isSafeInteger(Number(startId));
  const savedMode = params.get("mode") || "shortest";
  const validMode = ["shortest", "stairs", "elevator"].includes(savedMode);
  const routeMode = validMode ? savedMode : "shortest";
  const routeRequested = params.get("route") === "1";
  const [routeAttempt, setRouteAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [fitRequest, setFitRequest] = useState(0);
  const [floors, setFloors] = useState([]);
  const { path, distance, route, loading: routing, error, navigate, reset } = useNavigation();
  const indoor = room?.floor_id != null;
  const entranceOnly = room?.navigation_scope === "entrance";
  const destinationLabel = room?.navigation_label;
  const selectedStart = validStartId ? locations.find((node) => node.id === Number(startId)) : null;
  const selectedFloorId = floors.find((floor) => String(floor.id) === params.get("floor"))?.id
    ?? route?.segments?.[0]?.floor_id ?? room?.floor_id ?? null;
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId);
  const updateChoices = (changes) => setParams((previous) => {
    const next = new URLSearchParams(previous);
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
    setLocations([]);
    setFloors([]);
    setLoadError("");
    reset();
    if (!validRoomId) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    Promise.all([
      api.get(`/rooms/${roomId}`, { signal: controller.signal }).then((res) => res.data),
      getStartLocations(controller.signal),
    ]).then(async ([selectedRoom, nodes]) => {
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
      setLocations(nodes.filter((node) => selectedRoom.floor_id != null
        ? node.building_id === selectedRoom.building_id && node.floor_id != null
        : node.floor_id == null));
    }).catch((err) => {
      if (controller.signal.aborted) return;
      setLoadError(err.response?.status === 404
        ? "ไม่พบห้องที่เลือก กรุณาค้นหาห้องใหม่"
        : "โหลดข้อมูลสำหรับนำทางไม่ได้ กรุณาลองอีกครั้ง");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [roomId, validRoomId, attempt, reset]);

  // A restored URL reloads current map data and recomputes the route. Only the
  // choices live in the URL; stale geometry is never restored from storage.
  useEffect(() => {
    if (!loading && room?.id === Number(roomId) && room?.navigation_node_id
        && routeRequested && selectedStart && validMode) {
      navigate(selectedStart.id, room.navigation_node_id, routeMode);
    }
    return reset;
  }, [loading, room, roomId, routeRequested, selectedStart, validMode, routeMode,
      routeAttempt, navigate, reset]);

  const handleGo = (event) => {
    event.preventDefault();
    if (!routing && room?.navigation_node_id && selectedStart) {
      updateChoices({ route: "1", mode: routeMode, floor: null });
      setRouteAttempt((value) => value + 1);
    }
  };

  return (
    <div className="page navigation-page">
      <h2>นำทางไปห้องเรียน</h2>
      <Link to={searchUrl}>เลือกห้องอื่น</Link>
      {!validRoomId && <p>กรุณาค้นหาและเลือกห้องที่ต้องการไปก่อน</p>}
      {loading && <p role="status">กำลังโหลดห้องและจุดเริ่มต้น...</p>}
      {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => setAttempt((n) => n + 1)}>ลองอีกครั้ง</button></div>}
      {!loading && room && <>
        <h3>ปลายทาง: {room.name}</h3>
        <p>{room.building_name && `${room.building_name} · `}ชั้น {room.floor}</p>
        {room.is_demo && <aside className="demo-notice" aria-label="ข้อมูลจำลอง">
          <strong>โหมดทดลอง — ข้อมูลตัวอย่าง</strong>
          <p>ห้อง แผนผัง จุดสังเกต และระยะทางเป็นข้อมูลจำลอง สำหรับทดลองระบบเท่านั้น</p>
        </aside>}
        {entranceOnly && <aside className="demo-notice" aria-label="ขอบเขตการนำทาง">
          <strong>นำทางได้ถึงทางเข้าอาคารเท่านั้น</strong>
          <p>เส้นทางนี้สิ้นสุดที่ {destinationLabel} ยังไม่มีเส้นทางภายในอาคารไปถึงประตูห้อง {room.name} ชั้น {room.floor}</p>
        </aside>}
        {!room.navigation_node_id ? <p role="status">ห้องนี้ยังไม่มีข้อมูลเส้นทาง กรุณาเลือกห้องอื่น</p> : (
          locations.length === 0 ? <p role="status">ยังไม่มีจุดเริ่มต้นให้เลือก</p> : (
            <form onSubmit={handleGo}>
              <StartLocationPicker locations={locations} value={selectedStart ? startId : ""} onChange={(value) => {
                reset();
                updateChoices({ start: value, mode: routeMode, route: null, floor: null });
              }} />
              {indoor && <div className="route-mode-picker">
                <label htmlFor="route-mode">ขึ้นลงชั้นด้วยอะไร?</label>
                <select id="route-mode" value={routeMode} onChange={(event) => {
                  reset();
                  updateChoices({ mode: event.target.value, route: null, floor: null });
                }}>
                  <option value="shortest">เลือกเส้นทางสั้นที่สุด</option>
                  <option value="stairs">ใช้บันได</option>
                  <option value="elevator">ใช้ลิฟต์</option>
                </select>
              </div>}
              <button type="submit" disabled={!selectedStart || routing}>
                {routing ? "กำลังคำนวณ..." : "ค้นหาเส้นทาง"}
              </button>
            </form>
          )
        )}
        {room.navigation_node_id && startId && !selectedStart && <p role="alert">จุดเริ่มต้นเดิมใช้ไม่ได้แล้ว กรุณาเลือกจุดเริ่มต้นใหม่</p>}
        {room.navigation_node_id && routeRequested && !startId && <p role="alert">กรุณาเลือกจุดเริ่มต้นเพื่อคำนวณเส้นทางอีกครั้ง</p>}
        {routeRequested && !validMode && <p role="alert">ตัวเลือกเส้นทางเดิมไม่ถูกต้อง กรุณาเลือกวิธีขึ้นลงชั้นหรือกดค้นหาเส้นทางใหม่</p>}
        {routing && <p role="status">กำลังคำนวณเส้นทาง...</p>}
        {error && <p role="alert">{error}</p>}
        {distance !== null && <p role="status">
          {distance === 0 ? (entranceOnly
            ? "จุดเริ่มต้นที่เลือกอยู่ที่ทางเข้าอาคาร ยังไม่ใช่ประตูห้อง"
            : "จุดเริ่มต้นและจุดหมายเป็นจุดเดียวกัน")
            : `${room.is_demo ? "ระยะทางจำลอง" : "ระยะทาง"}: ${distance.toFixed(1)} เมตร`}
        </p>}
        {path.length > 0 && <div className="route-summary">
          <p><span className="route-key route-key--start" aria-hidden="true" />จุดเริ่มต้น: {locations.find((node) => node.id === Number(startId))?.label}</p>
          <p><span className="route-key route-key--end" aria-hidden="true" />จุดหมาย: {destinationLabel}</p>
          <p>คำนวณจากจุดเริ่มต้นที่เลือก หากเดินไปแล้วให้เปลี่ยนจุดเริ่มต้น</p>
          <button type="button" onClick={() => setFitRequest((value) => value + 1)}>{indoor ? "ดูเส้นทางในชั้นนี้" : "ดูเส้นทางทั้งหมด"}</button>
        </div>}
        <BuildingPlanBrowser key={room.id} destination={room} onSelectRoom={(selected) => {
          const next = new URLSearchParams({ room: String(selected.id) });
          if (searchQuery) next.set("q", searchQuery);
          goTo(`/navigate?${next}`);
        }} />
        {indoor ? <>
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
        </> : <div className="navigation-map" role="region" aria-label="แผนที่เส้นทางไปห้องเรียน">
          <CampusMap markers={[]}>
            <RoutePolyline
              path={path}
              startLabel={locations.find((node) => node.id === Number(startId))?.label}
              endLabel={destinationLabel}
              fitRequest={fitRequest}
            />
          </CampusMap>
        </div>}
      </>}
    </div>
  );
}
