import api from "./api";

/** Fetch buildings for map markers. */
export function getBuildings() {
  return api.get("/buildings").then((res) => res.data);
}

/** Request the shortest path between two nodes from the backend. */
export function getStartLocations(signal) {
  return api.get("/navigate/nodes", { signal }).then((res) => res.data);
}

export function getRoute(startNodeId, endNodeId, signal) {
  return api
    .post("/navigate/", { start_node_id: startNodeId, end_node_id: endNodeId }, { signal })
    .then((res) => res.data);
}
