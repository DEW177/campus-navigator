import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CampusMap from "../components/CampusMap";
import RoutePolyline from "../components/RoutePolyline";
import FloorMap from "../components/FloorMap";
import FloorSelector from "../components/FloorSelector";
import DirectionSteps from "../components/DirectionSteps";
import StartLocationPicker from "../components/StartLocationPicker";
import useNavigation from "../hooks/useNavigation";
import api from "../services/api";
import { getStartLocations, getFloors } from "../services/mapService";

export default function NavigationPage() {
  const [params] = useSearchParams();
  const roomId = params.get("room");
  const searchQuery = params.get("q");
  const searchUrl = searchQuery ? `/?${new URLSearchParams({ q: searchQuery })}` : "/";
  const validRoomId = /^[1-9]\d*$/.test(roomId || "") && Number.isSafeInteger(Number(roomId));
  const [room, setRoom] = useState(null);
  const [locations, setLocations] = useState([]);
  const [startId, setStartId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [fitRequest, setFitRequest] = useState(0);
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [routeMode, setRouteMode] = useState("shortest");
  const { path, distance, route, loading: routing, error, navigate, reset } = useNavigation();
  const indoor = room?.floor_id != null;
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId);

  useEffect(() => {
    if (route?.segments?.length) setSelectedFloorId(route.segments[0].floor_id);
  }, [route]);

  useEffect(() => {
    const controller = new AbortController();
    setRoom(null);
    setLocations([]);
    setStartId("");
    setFloors([]);
    setSelectedFloorId(null);
    setRouteMode("shortest");
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
      setSelectedFloorId(selectedRoom.floor_id ?? null);
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

  const handleGo = (event) => {
    event.preventDefault();
    if (!routing && room?.node_id && locations.some((node) => node.id === Number(startId))) {
      navigate(Number(startId), room.node_id, routeMode);
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
          <strong>โหมดทดลอง — อาคารจำลอง 3 ชั้น</strong>
          <p>ห้อง แผนผัง จุดสังเกต และระยะทางเป็นข้อมูลจำลอง สำหรับทดลองระบบเท่านั้น</p>
        </aside>}
        {!room.node_id ? <p role="status">ห้องนี้ยังไม่มีข้อมูลเส้นทาง กรุณาเลือกห้องอื่น</p> : (
          locations.length === 0 ? <p role="status">ยังไม่มีจุดเริ่มต้นให้เลือก</p> : (
            <form onSubmit={handleGo}>
              <StartLocationPicker locations={locations} value={startId} onChange={(value) => {
                setStartId(value);
                reset();
                setSelectedFloorId(room.floor_id ?? null);
              }} />
              {indoor && <div className="route-mode-picker">
                <label htmlFor="route-mode">ขึ้นลงชั้นด้วยอะไร?</label>
                <select id="route-mode" value={routeMode} onChange={(event) => {
                  setRouteMode(event.target.value);
                  reset();
                  setSelectedFloorId(room.floor_id);
                }}>
                  <option value="shortest">เลือกเส้นทางสั้นที่สุด</option>
                  <option value="stairs">ใช้บันได</option>
                  <option value="elevator">ใช้ลิฟต์</option>
                </select>
              </div>}
              <button type="submit" disabled={!startId || routing}>
                {routing ? "กำลังคำนวณ..." : "ค้นหาเส้นทาง"}
              </button>
            </form>
          )
        )}
        {routing && <p role="status">กำลังคำนวณเส้นทาง...</p>}
        {error && <p role="alert">{error}</p>}
        {distance !== null && <p role="status">
          {distance === 0 ? "จุดเริ่มต้นและจุดหมายเป็นจุดเดียวกัน" : `${room.is_demo ? "ระยะทางจำลอง" : "ระยะทาง"}: ${distance.toFixed(1)} เมตร`}
        </p>}
        {path.length > 0 && <div className="route-summary">
          <p><span className="route-key route-key--start" aria-hidden="true" />จุดเริ่มต้น: {locations.find((node) => node.id === Number(startId))?.label}</p>
          <p><span className="route-key route-key--end" aria-hidden="true" />จุดหมาย: {room.name}</p>
          <button type="button" onClick={() => setFitRequest((value) => value + 1)}>{indoor ? "ดูเส้นทางในชั้นนี้" : "ดูเส้นทางทั้งหมด"}</button>
        </div>}
        {indoor ? <>
          <h3>แผนผัง{selectedFloor?.name || `ชั้น ${room.floor}`}</h3>
          <FloorSelector floors={floors} value={selectedFloorId} onChange={setSelectedFloorId}
            routeFloorIds={(route?.segments || []).map((segment) => segment.floor_id)} />
          {selectedFloor ? <FloorMap floor={selectedFloor} route={route} fitRequest={fitRequest} />
            : <p role="status">ยังไม่มีแผนผังสำหรับชั้นนี้</p>}
          {path.length > 0 && !route?.segments?.some((segment) => segment.floor_id === selectedFloorId)
            && <p>เส้นทางนี้ไม่ผ่านชั้นที่กำลังดู กดชั้นที่ระบุว่ามีเส้นทาง</p>}
          <DirectionSteps steps={route?.directions || []} onSelectFloor={(floorId) => {
            setSelectedFloorId(floorId);
            document.querySelector(".floor-selector")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
          }} />
        </> : <div className="navigation-map" role="region" aria-label="แผนที่เส้นทางไปห้องเรียน">
          <CampusMap markers={[]}>
            <RoutePolyline
              path={path}
              startLabel={locations.find((node) => node.id === Number(startId))?.label}
              endLabel={room.name}
              fitRequest={fitRequest}
            />
          </CampusMap>
        </div>}
      </>}
    </div>
  );
}
