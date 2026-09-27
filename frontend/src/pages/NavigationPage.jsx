import React, { useState } from "react";
import CampusMap from "../components/CampusMap";
import RoutePolyline from "../components/RoutePolyline";
import useNavigation from "../hooks/useNavigation";

export default function NavigationPage() {
  const [startId, setStartId] = useState(null);
  const [endId, setEndId] = useState(null);
  const { path, distance, navigate } = useNavigation();

  const handleGo = () => {
    if (startId && endId) navigate(startId, endId);
  };

  return (
    <div className="page navigation-page">
      <h2>นำทาง</h2>
      <button onClick={handleGo}>ค้นหาเส้นทาง</button>
      {distance !== null && <p>ระยะทาง: {distance.toFixed(1)} เมตร</p>}
      <div style={{ height: "500px" }}>
        <CampusMap markers={[]}>
          <RoutePolyline path={path} />
        </CampusMap>
      </div>
    </div>
  );
}
