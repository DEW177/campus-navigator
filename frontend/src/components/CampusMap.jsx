import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./CampusMap.css";

/**
 * Renders the campus map using Leaflet, with a marker for each building/room.
 * Props:
 *  - center: [lat, lng]
 *  - markers: [{ id, name, latitude, longitude }]
 */
export default function CampusMap({ center = [16.4419, 102.8360], markers = [] }) {
  return (
    <div className="campus-map">
      <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.latitude, m.longitude]}>
            <Popup>{m.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
