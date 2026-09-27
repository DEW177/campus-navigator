import React, { useEffect } from "react";
import { Circle, CircleMarker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";

/** Only provider geometry is a route; no guessed connectors between markers. */
export default function LocationMarkers({ entrance, position, route }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (route) {
      const points = route.geometry.coordinates.flat().map(([lon, lat]) => [lat, lon]);
      map.fitBounds([...points, [position.latitude, position.longitude], [entrance.latitude, entrance.longitude]],
        { padding: [48, 48], maxZoom: 17, animate: false });
    } else if (position?.source === "pin") {
      // Preserve the view while placing/adjusting a pin.
    } else if (position) {
      map.fitBounds([[position.latitude, position.longitude], [entrance.latitude, entrance.longitude]],
        { padding: [48, 48], maxZoom: 17, animate: false });
    } else {
      map.setView([entrance.latitude, entrance.longitude], 17, { animate: false });
    }
  }, [map, entrance, position, route]);
  return <>
    {route && <Polyline positions={route.geometry.coordinates.map((line) => line.map(([lon, lat]) => [lat, lon]))}
      pathOptions={{ color: "#1d4ed8", weight: 6, opacity: 0.85 }} />}
    <CircleMarker center={[entrance.latitude, entrance.longitude]} radius={10}
      pathOptions={{ color: "white", weight: 2, fillColor: "#b91c1c", fillOpacity: 1 }}>
      <Tooltip permanent direction="top">ทางเข้าอาคาร</Tooltip>
      <Popup>{entrance.label}</Popup>
    </CircleMarker>
    {position && <>
      {Number.isFinite(position.accuracy) && <Circle center={[position.latitude, position.longitude]} radius={position.accuracy}
        pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.1 }} />}
      <CircleMarker center={[position.latitude, position.longitude]} radius={9}
        pathOptions={{ color: "white", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}>
        <Tooltip permanent direction="bottom">{position.source === "gps" ? "ตำแหน่งที่อ่านล่าสุด" : "จุดเริ่มต้นที่คุณเลือก"}</Tooltip>
        <Popup>{position.label}{Number.isFinite(position.accuracy) && ` · ความแม่นยำประมาณ ${Math.round(position.accuracy)} เมตร`}</Popup>
      </CircleMarker>
    </>}
  </>;
}
