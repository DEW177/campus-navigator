import React from "react";
import CampusMap from "./CampusMap";
import LocationMarkers from "./LocationMarkers";
import useCurrentLocation from "../hooks/useCurrentLocation";
import { hasCoordinates, directionsUrl, destinationUrl, mapsLocationUrl } from "../utils/location";

export default function OutdoorNavigation({ entrance, isDemo, hasIndoorRoute }) {
  const { position, loading, retrying, error, errorCode, locate, cancel } = useCurrentLocation();
  const mapped = hasCoordinates(entrance);
  const url = directionsUrl(position, entrance);
  return <section className="outdoor-navigation" aria-labelledby="outdoor-heading">
    <h3 id="outdoor-heading">ไปยังทางเข้าอาคาร</h3>
    {mapped ? <>
      <p>เริ่มจากตำแหน่งมือถือได้เลย ไม่ต้องกรอกที่อยู่หรือชั้นที่คุณอยู่</p>
      <button type="button" className="primary-action" onClick={locate} disabled={loading}>
        {loading ? "กำลังหาตำแหน่ง..." : error ? "ลองหาตำแหน่งอีกครั้ง"
          : position ? "อัปเดตตำแหน่งของฉัน" : "นำทางจากตำแหน่งของฉัน"}
      </button>
      {loading && <>
        <p role="status">{retrying ? "ยังหาตำแหน่งไม่ได้ กำลังลองอีกวิธี..."
          : "กำลังขอตำแหน่ง โปรดอนุญาตเมื่อเบราว์เซอร์ถาม"}</p>
        <button type="button" onClick={cancel}>ยกเลิกการหาตำแหน่ง</button>
      </>}
      {error && <p role="alert">{error}</p>}
      {[2, 3].includes(errorCode) && <div className="location-result">
        <a className="primary-action" href={mapsLocationUrl(entrance)} target="_blank" rel="noopener noreferrer">
          ให้ Google Maps หาตำแหน่งและนำทาง
        </a>
        <p>เปิด Google Maps ให้หาจุดเริ่มต้นเอง โดยใช้{isDemo ? "พิกัดตัวอย่างของ" : ""}ทางเข้าอาคารนี้เป็นปลายทาง</p>
      </div>}
      {position && <div className="location-result">
        <p role="status">พบตำแหน่งของคุณแล้ว · ความแม่นยำประมาณ {Math.round(position.accuracy)} เมตร</p>
        {position.accuracy > 100 && <p>ตำแหน่งยังคลาดเคลื่อนมาก ตรวจจุดเริ่มต้นใน Google Maps หรือกดอัปเดตตำแหน่งอีกครั้ง</p>}
        <a className="primary-action" href={url} target="_blank" rel="noopener noreferrer">
          {isDemo ? "เปิดเส้นทางไปพิกัดตัวอย่างใน Google Maps" : "เปิดเส้นทางไปอาคารใน Google Maps"}
        </a>
        <p>เส้นทางถนนและวิธีเดินทางจะแสดงใน Google Maps โดยใช้ตำแหน่งที่เพิ่งอ่านได้</p>
      </div>}
      {isDemo && <p className="demo-badge">พิกัดปลายทางเป็นข้อมูลตัวอย่าง ยังไม่ได้ยืนยันทางเข้าอาคารจริง</p>}
      <p><a href={destinationUrl(entrance)} target="_blank" rel="noopener noreferrer">ดูตำแหน่งอาคารใน Google Maps</a></p>
      {hasIndoorRoute && <p>เมื่อถึง {entrance.label} กลับมาหน้านี้เพื่อดูเส้นทางจากทางเข้าไปห้องด้านล่าง</p>}
      <div className="navigation-map" role="region" aria-label="ตำแหน่งของฉันและทางเข้าอาคาร">
        <CampusMap center={[entrance.latitude, entrance.longitude]}>
          <LocationMarkers entrance={entrance} position={position} />
        </CampusMap>
      </div>
      <p className="map-caption">แผนที่นี้แสดงตำแหน่ง เส้นทางเดินทางจริงเปิดดูใน Google Maps</p>
    </> : <p role="status">{isDemo
      ? "อาคารนี้เป็นอาคารจำลอง ไม่มีพิกัดสำหรับเดินทางจริง ทดลองเส้นทางจากทางเข้าในผังด้านล่างได้"
      : "อาคารนี้ยังไม่มีพิกัดทางเข้า คุณยังดูผังห้องและเส้นทางภายในที่มีข้อมูลได้"}</p>}
  </section>;
}
