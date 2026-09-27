import React, { useEffect, useRef } from "react";
import { DomEvent } from "leaflet";
import { useMapEvents } from "react-leaflet";

export default function MapStartPicker({ active, onPick }) {
  const control = useRef(null);
  useEffect(() => {
    if (control.current) {
      DomEvent.disableClickPropagation(control.current);
      DomEvent.disableScrollPropagation(control.current);
    }
  }, [active]);
  const pick = (latlng) => onPick({ latitude: latlng.lat,
    longitude: ((latlng.lng + 180) % 360 + 360) % 360 - 180,
    source: "pin", label: "จุดที่เลือกบนแผนที่" });
  const map = useMapEvents({ click: (event) => { if (active) pick(event.latlng); } });
  if (!active) return null;
  return <div ref={control} className="map-pick-control" onClick={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => pick(map.getCenter())}>เลือกจุดกลางแผนที่</button>
  </div>;
}
