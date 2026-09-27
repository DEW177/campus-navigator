import React, { useEffect, useMemo } from "react";
import { divIcon } from "leaflet";
import { Marker, Polyline, Popup, useMap } from "react-leaflet";

// Static markup only: place names are rendered by React inside the popup.
const endpointIcons = Object.fromEntries([
  ["start", "เริ่ม"], ["end", "ถึง"], ["same", "เริ่ม/ถึง"],
].map(([kind, text]) => [kind, divIcon({
  className: `route-endpoint route-endpoint--${kind}`,
  html: `<span>${text}</span>`,
  iconSize: kind === "same" ? [52, 36] : [40, 36],
  iconAnchor: kind === "same" ? [26, 18] : [20, 18],
  popupAnchor: [0, -20],
})]));

/**
 * Draws the shortest-path route returned by POST /api/navigate on the map.
 * Props: path -> [{ latitude, longitude }, ...]
 */
export default function RoutePolyline({
  path = [], color = "#2563eb", startLabel = "จุดเริ่มต้น",
  endLabel = "จุดหมาย", fitRequest = 0,
}) {
  const map = useMap();
  const positions = useMemo(() => path.map((node) => [node.latitude, node.longitude]), [path]);
  const first = positions[0];
  const last = positions[positions.length - 1];
  const endpointsOverlap = first && first[0] === last[0] && first[1] === last[1];

  useEffect(() => {
    if (!positions.length) return;
    map.invalidateSize({ pan: false });
    const singleLocation = positions.every(([lat, lng]) => lat === positions[0][0] && lng === positions[0][1]);
    if (singleLocation) {
      map.setView(positions[0], 19, { animate: false });
    } else {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 19, animate: false });
    }
  }, [map, positions, fitRequest]);

  if (!positions.length) return null;

  return <>
    {positions.length > 1 && <>
      <Polyline positions={positions} className="route-outline" pathOptions={{ color: "white", weight: 9, opacity: 0.95 }} interactive={false} />
      <Polyline positions={positions} className="route-line" pathOptions={{ color, weight: 5, opacity: 1 }} interactive={false} />
    </>}
    {endpointsOverlap ? (
      <Marker position={first} icon={endpointIcons.same} title="จุดเริ่มต้นและจุดหมาย" alt="จุดเริ่มต้นและจุดหมาย">
        <Popup><strong>จุดเริ่มต้น: {startLabel}</strong><br />จุดหมาย: {endLabel}</Popup>
      </Marker>
    ) : <>
      <Marker position={first} icon={endpointIcons.start} title={`จุดเริ่มต้น: ${startLabel}`} alt={`จุดเริ่มต้น: ${startLabel}`}>
        <Popup><strong>จุดเริ่มต้น</strong><br />{startLabel}</Popup>
      </Marker>
      <Marker position={last} icon={endpointIcons.end} title={`จุดหมาย: ${endLabel}`} alt={`จุดหมาย: ${endLabel}`}>
        <Popup><strong>จุดหมาย</strong><br />{endLabel}</Popup>
      </Marker>
    </>}
  </>;
}
