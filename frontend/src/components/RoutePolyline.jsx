import React from "react";
import { Polyline } from "react-leaflet";

/**
 * Draws the shortest-path route returned by POST /api/navigate on the map.
 * Props: path -> [{ latitude, longitude }, ...]
 */
export default function RoutePolyline({ path = [], color = "#2563eb" }) {
  if (!path.length) return null;
  const positions = path.map((n) => [n.latitude, n.longitude]);
  return <Polyline positions={positions} color={color} weight={5} />;
}
