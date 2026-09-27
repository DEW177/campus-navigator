import React, { useEffect, useId, useRef, useState } from "react";
import FloorMap from "./FloorMap";
import FloorSelector from "./FloorSelector";
import RoomCard from "./RoomCard";
import api from "../services/api";
import { getBuildings, getFloors } from "../services/mapService";

function PlanDialog({ destination, onClose, onSelectRoom, returnLabel }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [building, setBuilding] = useState(null);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [floorId, setFloorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const indoor = destination?.floor_id != null;
  const buildingId = indoor ? destination.building_id : null;
  const destinationFloorId = indoor ? destination.floor_id : null;
  const buildingName = indoor ? destination.building_name : null;
  const isDemo = indoor ? destination.is_demo : true;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const load = async () => {
      const target = buildingId != null
        ? { id: buildingId, name: buildingName, is_demo: isDemo }
        : (await getBuildings(controller.signal)).find((item) => item.code === "DEMO" && item.is_demo);
      if (controller.signal.aborted) return;
      if (!target) {
        setError("ยังไม่มีอาคารทดลองให้ดู กรุณาลองอีกครั้งเมื่อมีข้อมูลแล้ว");
        return;
      }
      const [floorList, response] = await Promise.all([
        getFloors(target.id, controller.signal),
        api.get("/rooms/", { params: { building_id: target.id }, signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setBuilding(target);
      setFloors(floorList);
      setRooms(response.data.filter((room) => room.building_id === target.id));
      setFloorId(floorList.find((floor) => floor.id === destinationFloorId)?.id ?? floorList[0]?.id ?? null);
    };
    load().catch(() => {
      if (!controller.signal.aborted) setError("โหลดผังอาคารไม่ได้ กรุณาลองอีกครั้ง");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [buildingId, buildingName, destinationFloorId, isDemo, attempt]);

  const floor = floors.find((item) => item.id === floorId);
  const floorRooms = rooms.filter((room) => room.floor_id === floorId);

  return (
    <dialog ref={dialog} className="plan-dialog" aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault();
      onClose();
    }}>
      <header className="plan-dialog-header">
        <h2 id={titleId}>{indoor ? `ผัง${buildingName || "อาคาร"}` : "ผังอาคารทดลอง 3 ชั้น"}</h2>
        <button type="button" onClick={onClose} autoFocus>{returnLabel}</button>
      </header>
      <div className="plan-dialog-content" aria-busy={loading}>
        {isDemo && <aside className="demo-notice">
          <strong>แผนผังจำลองสำหรับทดลองใช้งาน</strong>
          <p>{destination && !indoor
            ? `อาคารทดลอง DEMO แยกจากปลายทาง ${destination.name} ที่กำลังเลือกอยู่`
            : "ห้อง แผนผัง และระยะทางเป็นข้อมูลจำลอง"}</p>
        </aside>}
        {loading && <p role="status">กำลังโหลดผังอาคาร...</p>}
        {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((n) => n + 1)}>ลองอีกครั้ง</button></div>}
        {!loading && !error && building && <>
          {floor ? <>
            <p>เลือกชั้น แล้วแตะหมุดห้องบนผัง หรือเลือกจากรายการด้านล่าง</p>
            {indoor && <p className="plan-current-room">ห้องที่เลือกอยู่: {destination.name} · ชั้น {destination.floor}</p>}
            <FloorSelector floors={floors} value={floorId} onChange={setFloorId} />
            <h3>{floor.name}</h3>
            <FloorMap floor={floor} rooms={floorRooms} selectedRoomId={indoor ? destination.id : null} onSelectRoom={onSelectRoom} />
            <section aria-label={`ห้องบน${floor.name}`} className="plan-room-list">
              <h3>ห้องบน{floor.name}</h3>
              {floorRooms.length === 0 && <p>ยังไม่มีข้อมูลห้องในชั้นนี้</p>}
              {floorRooms.map((room) => <RoomCard key={room.id} room={room} onSelect={onSelectRoom} />)}
            </section>
          </> : <p role="status">ยังไม่มีแผนผังสำหรับอาคารนี้</p>}
        </>}
      </div>
    </dialog>
  );
}

/** Browsing is local UI state: opening/closing never replaces the current route. */
export default function BuildingPlanBrowser({ destination = null, onSelectRoom, returnLabel = "กลับไปแผนที่" }) {
  const [open, setOpen] = useState(false);
  const indoor = destination?.floor_id != null;
  return (
    <div className="plan-browser">
      <button type="button" className="plan-browser-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {indoor ? `ดูผังชั้น ${destination.floor} · ห้อง ${destination.name}` : "ดูผังอาคารทดลอง"}
      </button>
      {open && <PlanDialog destination={destination} returnLabel={returnLabel} onClose={() => setOpen(false)}
        onSelectRoom={(room) => { setOpen(false); onSelectRoom(room); }} />}
    </div>
  );
}
