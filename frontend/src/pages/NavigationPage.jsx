import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CampusMap from "../components/CampusMap";
import RoutePolyline from "../components/RoutePolyline";
import StartLocationPicker from "../components/StartLocationPicker";
import useNavigation from "../hooks/useNavigation";
import api from "../services/api";
import { getStartLocations } from "../services/mapService";

export default function NavigationPage() {
  const [params] = useSearchParams();
  const roomId = params.get("room");
  const validRoomId = /^[1-9]\d*$/.test(roomId || "") && Number.isSafeInteger(Number(roomId));
  const [room, setRoom] = useState(null);
  const [locations, setLocations] = useState([]);
  const [startId, setStartId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [fitRequest, setFitRequest] = useState(0);
  const { path, distance, loading: routing, error, navigate, reset } = useNavigation();

  useEffect(() => {
    const controller = new AbortController();
    setRoom(null);
    setLocations([]);
    setStartId("");
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
    ]).then(([selectedRoom, nodes]) => {
      if (controller.signal.aborted) return;
      if (!selectedRoom) {
        setLoadError("ไม่พบห้องที่เลือก กรุณาค้นหาห้องใหม่");
        return;
      }
      setRoom(selectedRoom);
      setLocations(nodes);
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
      navigate(Number(startId), room.node_id);
    }
  };

  return (
    <div className="page navigation-page">
      <h2>นำทางไปห้องเรียน</h2>
      <Link to="/search">เลือกห้องอื่น</Link>
      {!validRoomId && <p>กรุณาค้นหาและเลือกห้องที่ต้องการไปก่อน</p>}
      {loading && <p role="status">กำลังโหลดห้องและจุดเริ่มต้น...</p>}
      {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => setAttempt((n) => n + 1)}>ลองอีกครั้ง</button></div>}
      {!loading && room && <>
        <h3>ปลายทาง: {room.name}</h3>
        <p>ชั้น {room.floor}</p>
        {!room.node_id ? <p role="status">ห้องนี้ยังไม่มีข้อมูลเส้นทาง กรุณาเลือกห้องอื่น</p> : (
          locations.length === 0 ? <p role="status">ยังไม่มีจุดเริ่มต้นให้เลือก</p> : (
            <form onSubmit={handleGo}>
              <StartLocationPicker locations={locations} value={startId} onChange={(value) => {
                setStartId(value);
                reset();
              }} />
              <button type="submit" disabled={!startId || routing}>
                {routing ? "กำลังคำนวณ..." : "ค้นหาเส้นทาง"}
              </button>
            </form>
          )
        )}
        {routing && <p role="status">กำลังคำนวณเส้นทาง...</p>}
        {error && <p role="alert">{error}</p>}
        {distance !== null && <p role="status">
          {distance === 0 ? "จุดเริ่มต้นและจุดหมายเป็นจุดเดียวกัน" : `ระยะทาง: ${distance.toFixed(1)} เมตร`}
        </p>}
        {path.length > 0 && <div className="route-summary">
          <p><span className="route-key route-key--start" aria-hidden="true" />จุดเริ่มต้น: {locations.find((node) => node.id === Number(startId))?.label}</p>
          <p><span className="route-key route-key--end" aria-hidden="true" />จุดหมาย: {room.name}</p>
          <button type="button" onClick={() => setFitRequest((value) => value + 1)}>ดูเส้นทางทั้งหมด</button>
        </div>}
        <div className="navigation-map" role="region" aria-label="แผนที่เส้นทางไปห้องเรียน">
          <CampusMap markers={[]}>
            <RoutePolyline
              path={path}
              startLabel={locations.find((node) => node.id === Number(startId))?.label}
              endLabel={room.name}
              fitRequest={fitRequest}
            />
          </CampusMap>
        </div>
      </>}
    </div>
  );
}
