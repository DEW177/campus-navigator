import { useState, useCallback } from "react";
import { getRoute } from "../services/mapService";

/** Handles requesting and storing a shortest-path route. */
export default function useNavigation() {
  const [path, setPath] = useState([]);
  const [distance, setDistance] = useState(null);

  const navigate = useCallback((startNodeId, endNodeId) => {
    getRoute(startNodeId, endNodeId).then((data) => {
      setPath(data.path);
      setDistance(data.total_distance);
    });
  }, []);

  return { path, distance, navigate };
}
