import React, { useEffect, useMemo, useState } from "react";
import { CRS, divIcon } from "leaflet";
import { MapContainer, ImageOverlay, Polyline, CircleMarker, Marker, Popup, Tooltip, useMap } from "react-leaflet";
import { mapAssetUrl } from "../services/mapService";
import { floorPosition, floorSegments } from "../utils/indoorMap";
import "leaflet/dist/leaflet.css";
import "./CampusMap.css";

const roomIcon = (selected) => divIcon({
  className: `room-plan-marker${selected ? " room-plan-marker--selected" : ""}`,
  html: '<span aria-hidden="true">ห้อง</span>',
  iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22], tooltipAnchor: [0, 0],
});

function FitFloor({ floor, segments, fitRequest, browsingRooms }) {
  const map = useMap();
  useEffect(() => {
    const points = segments.flat().map((node) => floorPosition(node, floor));
    const fit = () => map.fitBounds(points.length > 1 ? points : [[0, 0], [floor.height, floor.width]], {
      padding: browsingRooms ? [16, 16] : [44, 44], maxZoom: 0.5, animate: false,
    });
    map.invalidateSize();
    fit();
    map.on("resize", fit);
    return () => map.off("resize", fit);
  }, [map, floor, segments, fitRequest, browsingRooms]);
  return null;
}

export default function FloorMap({ floor, route, fitRequest = 0, rooms = [], selectedRoomId = null, onSelectRoom }) {
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
          {rooms.filter((room) => room.floor_id === floor.id && room.map_position
            && Number.isFinite(room.map_position.x) && Number.isFinite(room.map_position.y)
            && room.map_position.x >= 0 && room.map_position.x <= floor.width
            && room.map_position.y >= 0 && room.map_position.y <= floor.height).map((room, index) => (
            <Marker key={`room-${room.id}`} position={floorPosition(room.map_position, floor)}
              icon={roomIcon(room.id === selectedRoomId)} title={`ดูห้อง ${room.name}`} keyboard>
              <Tooltip permanent direction={index % 2 === 0 ? "top" : "bottom"}
                offset={[0, index % 2 === 0 ? -22 : 22]}
                className={room.id === selectedRoomId ? "room-tooltip--selected" : ""}>{room.name}</Tooltip>
              <Popup>
                <strong>{room.name}</strong><p>ชั้น {room.floor}</p>
                {room.node_id && onSelectRoom
                  ? <button type="button" onClick={() => onSelectRoom(room)}>ไปห้องนี้</button>
                  : <p>ห้องนี้ยังไม่มีข้อมูลเส้นทาง</p>}
              </Popup>
            </Marker>
          ))}
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
          <FitFloor floor={floor} segments={segments} fitRequest={fitRequest} browsingRooms={!!onSelectRoom} />
        </MapContainer>
      </div>
    </>
  );
}
