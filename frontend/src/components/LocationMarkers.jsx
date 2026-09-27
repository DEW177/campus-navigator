import React, { useEffect } from "react";
import { Circle, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";

/** Positions only: a straight line between home and a building is not a route. */
export default function LocationMarkers({ entrance, position }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (position) {
      map.fitBounds([[position.latitude, position.longitude], [entrance.latitude, entrance.longitude]],
        { padding: [48, 48], maxZoom: 17, animate: false });
    } else {
      map.setView([entrance.latitude, entrance.longitude], 17, { animate: false });
    }
  }, [map, entrance, position]);
  return <>
    <CircleMarker center={[entrance.latitude, entrance.longitude]} radius={10}
      pathOptions={{ color: "white", weight: 2, fillColor: "#b91c1c", fillOpacity: 1 }}>
      <Tooltip permanent direction="top">ทางเข้าอาคาร</Tooltip>
      <Popup>{entrance.label}</Popup>
    </CircleMarker>
    {position && <>
      <Circle center={[position.latitude, position.longitude]} radius={position.accuracy}
        pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.1 }} />
      <CircleMarker center={[position.latitude, position.longitude]} radius={9}
        pathOptions={{ color: "white", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}>
        <Tooltip permanent direction="bottom">ตำแหน่งจากมือถือ</Tooltip>
        <Popup>ตำแหน่งที่อ่านล่าสุด · ความแม่นยำประมาณ {Math.round(position.accuracy)} เมตร</Popup>
      </CircleMarker>
    </>}
  </>;
}
