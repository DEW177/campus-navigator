import api from "./api";

/** Fetch buildings for map markers. */
export function getBuildings() {
  return api.get("/buildings").then((res) => res.data);
}

/** Request the shortest path between two nodes from the backend. */
export function getRoute(startNodeId, endNodeId) {
  return api
    .post("/navigate", { start_node_id: startNodeId, end_node_id: endNodeId })
    .then((res) => res.data);
}
