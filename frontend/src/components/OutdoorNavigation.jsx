import React, { useEffect, useRef, useState } from "react";
import CampusMap from "./CampusMap";
import LocationMarkers from "./LocationMarkers";
import MapStartPicker from "./MapStartPicker";
import useCurrentLocation from "../hooks/useCurrentLocation";
import useOutdoorRequest from "../hooks/useOutdoorRequest";
import api from "../services/api";
import { hasCoordinates, directionsUrl, destinationUrl, mapsLocationUrl } from "../utils/location";

const distanceText = (meters) => meters < 1000 ? `${Math.round(meters)} เมตร` : `${(meters / 1000).toFixed(1)} กม.`;
function timeText(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes < 60 ? `${minutes} นาที` : `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`;
}
function Attribution({ results = [] }) {
  const sources = [...new Set(results.map((item) => item.attribution).filter(Boolean))];
  return <p className="map-caption">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>
    {" · "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
    {sources.length > 0 && <span> · {sources.join(" · ")}</span>}</p>;
}

export default function OutdoorNavigation({ buildingId, entrance, isDemo, hasIndoorRoute }) {
  const gps = useCurrentLocation();
  const search = useOutdoorRequest("/outdoor/search");
  const route = useOutdoorRequest("/outdoor/route");
  const [method, setMethod] = useState("gps");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [start, setStart] = useState(null);
  const [mode, setMode] = useState("walk");
  const [configured, setConfigured] = useState(null);
  const mapArea = useRef(null);
  const mapped = hasCoordinates(entrance);
  const routeReset = route.reset;
  const currentPosition = gps.position;

  useEffect(() => {
    if (!mapped) return;
    const controller = new AbortController();
    api.get("/outdoor/status", { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted && typeof data?.configured === "boolean") setConfigured(data.configured);
    }).catch(() => {});
    return () => controller.abort();
  }, [mapped]);
  useEffect(() => {
    if (currentPosition && method === "gps") {
      setStart({ ...currentPosition, source: "gps", label: "ตำแหน่งที่อ่านล่าสุด" });
      setCandidate(null); routeReset();
    }
  }, [currentPosition, method, routeReset]);

  const changeMethod = (next) => {
    gps.cancel(); search.reset(); route.reset();
    setCandidate(null); setStart(null); setSearchedQuery(""); setMethod(next);
    if (next === "pin") mapArea.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  };
  const locate = () => { changeMethod("gps"); gps.locate(); };
  const handleSearch = (event) => {
    event.preventDefault();
    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized.length < 2 || search.loading || (search.data && normalized === searchedQuery)) return;
    setCandidate(null); setStart(null); route.reset(); setSearchedQuery(normalized);
    search.run({ query: normalized, building_id: buildingId });
  };
  const chooseCandidate = (point) => {
    if (!hasCoordinates(point)) return;
    setCandidate(point); setStart(null); route.reset();
  };
  const requestRoute = () => {
    if (!start || route.loading || route.data) return;
    route.run({ origin: { latitude: start.latitude, longitude: start.longitude }, building_id: buildingId, mode });
  };
  const results = Array.isArray(search.data?.results) ? search.data.results : [];
  const displayedPosition = candidate || start;

  return <section className="outdoor-navigation" aria-labelledby="outdoor-heading">
    <h3 id="outdoor-heading">ไปยังทางเข้าอาคาร</h3>
    {mapped ? <>
      {isDemo && <p className="demo-badge">พิกัดปลายทางเป็นข้อมูลตัวอย่าง ยังไม่ได้ยืนยันทางเข้าอาคารจริง</p>}
      <p>เริ่มจากที่ไหน? ใช้ตำแหน่งปัจจุบัน ค้นหาที่อยู่ หรือเลือกบนแผนที่</p>
      <div className="start-methods" role="group" aria-label="เลือกวิธีระบุจุดเริ่มต้น">
        <button type="button" className="primary-action" onClick={locate} disabled={gps.loading}>
          {gps.loading ? "กำลังหาตำแหน่ง..." : method === "gps" && gps.error ? "ลองหาตำแหน่งอีกครั้ง"
            : method === "gps" && start ? "อัปเดตตำแหน่งของฉัน" : "นำทางจากตำแหน่งของฉัน"}
        </button>
        <button type="button" aria-pressed={method === "search"} onClick={() => changeMethod("search")}>ค้นหาสถานที่หรือที่อยู่</button>
        <button type="button" aria-pressed={method === "pin"} onClick={() => changeMethod("pin")}>เลือกจุดบนแผนที่</button>
      </div>
      {method === "gps" && <>
        {gps.loading && <>
          <p role="status">{gps.retrying ? "ยังหาตำแหน่งไม่ได้ กำลังลองอีกวิธี..." : "กำลังขอตำแหน่ง โปรดอนุญาตเมื่อเบราว์เซอร์ถาม"}</p>
          <button type="button" onClick={gps.cancel}>ยกเลิกการหาตำแหน่ง</button>
        </>}
        {gps.error && <p role="alert">{gps.error} หรือเลือกจุดเริ่มต้นด้วยวิธีอื่นด้านบน</p>}
        {[2, 3].includes(gps.errorCode) && <p><a href={mapsLocationUrl(entrance)} target="_blank" rel="noopener noreferrer">
          ให้ Google Maps หาตำแหน่งและนำทาง</a></p>}
      </>}
      {configured === false && <p className="service-notice" role="status">
        บริการค้นหาและเส้นทางยังไม่พร้อม คุณยังใช้ตำแหน่งปัจจุบันหรือเลือกจุดบนแผนที่ แล้วเปิด Google Maps ได้
      </p>}
      {method === "search" && <div className="outdoor-search">
        <form onSubmit={handleSearch} aria-label="ค้นหาจุดเริ่มต้น">
          <label htmlFor="origin-search">ชื่อสถานที่หรือที่อยู่ในประเทศไทย</label>
          <div className="search-row"><input id="origin-search" value={query} maxLength={200}
            placeholder="เช่น ชื่อหอพัก ถนน หรือจังหวัด" autoComplete="off" onChange={(event) => {
              setQuery(event.target.value); search.reset(); setSearchedQuery("");
              setCandidate(null); setStart(null); route.reset();
            }} />
            <button type="submit" disabled={search.loading || configured === false || query.trim().length < 2}>
              {search.loading ? "กำลังค้นหา..." : "ค้นหา"}
            </button></div>
          <p className="map-caption">พิมพ์แล้วกดค้นหาหรือ Enter · เพิ่มจังหวัดเพื่อแยกสถานที่ชื่อซ้ำ</p>
        </form>
        {search.loading && <p role="status">กำลังค้นหาสถานที่...</p>}
        {search.error && <p role="alert">{search.error}</p>}
        {search.data && results.length === 0 && <p role="status">ไม่พบสถานที่ ลองชื่อถนนหรือจังหวัด หรือเลือกจุดบนแผนที่</p>}
        {results.length > 0 && <ul className="place-results" aria-label="ผลค้นหาจุดเริ่มต้น">
          {results.map((place, index) => <li key={index}><button type="button"
            onClick={() => chooseCandidate({ ...place, source: "search" })}>{place.label}</button></li>)}
        </ul>}
        {search.data && <Attribution results={results} />}
      </div>}
      {method === "pin" && <p id="pin-help" role="status">เลื่อนและซูมแผนที่ แล้วแตะจุดเริ่มต้น หรือกดเลือกจุดกลางแผนที่</p>}
      {start?.source === "gps" && <>
        <p role="status">พบตำแหน่งของคุณแล้ว · ความแม่นยำประมาณ {Math.round(start.accuracy)} เมตร</p>
        {start.accuracy > 100 && <p>ตำแหน่งยังคลาดเคลื่อนมาก ตรวจหมุดหรือเลือกจุดบนแผนที่แทนได้</p>}
      </>}
      <div ref={mapArea} className={`navigation-map ${method === "pin" ? "picking-start" : ""}`}
        role="region" aria-label="แผนที่จุดเริ่มต้นและทางเข้าอาคาร">
        <CampusMap center={[entrance.latitude, entrance.longitude]}>
          <LocationMarkers entrance={entrance} position={displayedPosition} route={route.data} />
          <MapStartPicker active={method === "pin" && !start} onPick={chooseCandidate} />
        </CampusMap>
      </div>
      {candidate && <div className="location-result">
        <p>ตรวจสอบจุดเริ่มต้น: <strong>{candidate.label}</strong></p>
        <p className="map-caption">{candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)} · จุดที่คุณเลือก ไม่ใช่ตำแหน่งที่ตรวจพบจากเครื่อง</p>
        <button type="button" className="primary-action" onClick={() => { setStart(candidate); setCandidate(null); }}>ใช้จุดนี้เป็นจุดเริ่มต้น</button>
      </div>}
      {start && <div className="location-result">
        <p>จุดเริ่มต้น: <strong>{start.label}</strong>{start.source !== "gps" && " · คุณเลือกจุดนี้เอง"}</p>
        <button type="button" onClick={() => changeMethod(method)}>เปลี่ยนจุดเริ่มต้น</button>
        <div className="route-mode-picker"><label htmlFor="outdoor-mode">เดินทางไปอาคารด้วยอะไร?</label>
          <select id="outdoor-mode" value={mode} onChange={(event) => { route.reset(); setMode(event.target.value); }}>
            <option value="walk">เดิน</option><option value="drive">ขับรถ</option>
          </select></div>
        <button type="button" className="primary-action" onClick={requestRoute}
          disabled={route.loading || configured === false || !!route.data}>
          {route.loading ? "กำลังหาเส้นทาง..." : route.data ? "แสดงเส้นทางแล้ว" : "ดูเส้นทางบนแผนที่"}
        </button>
        {route.loading && <p role="status">กำลังคำนวณเส้นทางกลางแจ้ง...</p>}
        {route.error && <p role="alert">{route.error}</p>}
        {route.data && <div className="outdoor-route-summary" role="status">
          <p><strong>{mode === "walk" ? "เส้นทางเดิน" : "เส้นทางขับรถ"}: {distanceText(route.data.distance_m)}</strong>
            {" · ประมาณ "}{timeText(route.data.duration_s)}</p>
          <p className="map-caption">เวลาโดยประมาณ ไม่รวมสภาพจราจรสดและการเดินภายในอาคาร</p>
          {route.data.start_gap_m > 20 && <p>จุดเริ่มเส้นทางบนถนน/ทางเดินห่างจากหมุด {distanceText(route.data.start_gap_m)} โปรดตรวจทางเชื่อมจริง</p>}
          {route.data.end_gap_m > 20 && <p>ปลายเส้นทางห่างจากทางเข้าอาคาร {distanceText(route.data.end_gap_m)} ยังไม่มีข้อมูลทางเชื่อมช่วงสุดท้าย</p>}
          <Attribution />
        </div>}
        {mode === "drive" && <p>เส้นทางรถไปถึงจุดที่ถนนเข้าถึงใกล้อาคาร ยังไม่ได้ระบุที่จอดรถหรือยืนยันว่าขับถึงประตูได้</p>}
        <p><a href={directionsUrl(start, entrance, mode)} target="_blank" rel="noopener noreferrer">
          {isDemo ? "เปิดเส้นทางไปพิกัดตัวอย่างใน Google Maps" : "เปิดเส้นทางไปอาคารใน Google Maps"}</a></p>
      </div>}
      <p className="map-caption">แสดงเส้นทางเพื่อวางแผนการเดินทาง หมุดไม่ติดตามสด · ตรวจทางเดินและทางเข้าอาคารกับสภาพจริง</p>
      <p><a href={destinationUrl(entrance)} target="_blank" rel="noopener noreferrer">ดูตำแหน่งอาคารใน Google Maps</a></p>
      {hasIndoorRoute && <p>ต่อไป: ดูผังและเส้นทางจาก {entrance.label} ไปห้องในส่วน “จากทางเข้าไปห้องเรียน” ด้านล่าง</p>}
    </> : <p role="status">{isDemo
      ? "อาคารนี้เป็นอาคารจำลอง ไม่มีพิกัดสำหรับเดินทางจริง ทดลองเส้นทางจากทางเข้าในผังด้านล่างได้"
      : "อาคารนี้ยังไม่มีพิกัดทางเข้า คุณยังดูผังห้องและเส้นทางภายในที่มีข้อมูลได้"}</p>}
  </section>;
}
