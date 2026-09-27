import React, { useEffect, useMemo, useState } from "react";
import { CRS } from "leaflet";
import { MapContainer, ImageOverlay, Polyline, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import { mapAssetUrl } from "../services/mapService";
import { floorPosition, floorSegments } from "../utils/indoorMap";
import "leaflet/dist/leaflet.css";
import "./CampusMap.css";

function FitFloor({ floor, segments, fitRequest }) {
  const map = useMap();
  useEffect(() => {
    const points = segments.flat().map((node) => floorPosition(node, floor));
    const fit = () => map.fitBounds(points.length > 1 ? points : [[0, 0], [floor.height, floor.width]], {
      padding: [44, 44], maxZoom: 0.5, animate: false,
    });
    map.invalidateSize();
    fit();
    map.on("resize", fit);
    return () => map.off("resize", fit);
  }, [map, floor, segments, fitRequest]);
  return null;
}

export default function FloorMap({ floor, route, fitRequest = 0 }) {
  const [imageError, setImageError] = useState(false);
  const segments = useMemo(() => floorSegments(route, floor.id), [route, floor.id]);
  useEffect(() => setImageError(false), [floor.id]);
  const path = route?.path || [];
  const visibleNodes = [...new Map(segments.flat().filter((node) => node.label).map((node) => [node.id, node])).values()];
  return (
    <>
      {imageError && <p role="alert">โหลดแผนผังไม่ได้ ลองเปลี่ยนชั้นหรือใช้ขั้นตอนด้านล่าง</p>}
      <div className="navigation-map indoor-map" role="region" aria-label={`แผนผัง${floor.name}`}>
        <MapContainer key={floor.id} crs={CRS.Simple} bounds={[[0, 0], [floor.height, floor.width]]}
          minZoom={-4} maxZoom={2} zoomSnap={0.25} style={{ height: "100%", width: "100%" }}>
          <ImageOverlay url={mapAssetUrl(floor.image_url)} bounds={[[0, 0], [floor.height, floor.width]]}
            eventHandlers={{ error: () => setImageError(true) }} />
          {segments.filter((nodes) => nodes.length > 1).map((nodes, index) => (
            <Polyline key={index} positions={nodes.map((node) => floorPosition(node, floor))} pathOptions={{ color: "#1d4ed8", weight: 6 }} />
          ))}
          {visibleNodes.map((node) => {
            const start = node.id === path[0]?.id;
            const end = node.id === path[path.length - 1]?.id;
            const label = start && end ? "เริ่มต้น / จุดหมาย" : start ? "เริ่มต้น" : end ? "จุดหมาย" : node.kind === "stairs" ? "บันได" : node.kind === "elevator" ? "ลิฟต์" : node.label;
            return <CircleMarker key={node.id} center={floorPosition(node, floor)} radius={9}
              pathOptions={{ color: "white", weight: 2, fillColor: end ? "#b91c1c" : start ? "#15803d" : "#6d28d9", fillOpacity: 1 }}>
              <Tooltip permanent direction="top">{label}</Tooltip>
              <Popup><strong>{node.label}</strong>{node.landmark_description && <p>{node.landmark_description}</p>}</Popup>
            </CircleMarker>;
          })}
          <FitFloor floor={floor} segments={segments} fitRequest={fitRequest} />
        </MapContainer>
      </div>
    </>
  );
}
