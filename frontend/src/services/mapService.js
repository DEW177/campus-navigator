import api from "./api";

/** Fetch buildings for map markers. */
export function getBuildings(signal) {
  return api.get("/buildings/", { signal }).then((res) => res.data);
}

/** Request the shortest path between two nodes from the backend. */
export function getStartLocations(signal) {
  return api.get("/navigate/nodes", { signal }).then((res) => res.data);
}

export function getRoute(startNodeId, endNodeId, signal, routeMode = "shortest") {
  return api
    .post("/navigate/", { start_node_id: startNodeId, end_node_id: endNodeId, route_mode: routeMode }, { signal })
    .then((res) => res.data);
}

export function getFloors(buildingId, signal) {
  return api.get("/floors/", { params: { building_id: buildingId }, signal }).then((res) => res.data);
}

/** Static floor plans live on the API server, which can differ from the web origin. */
export function mapAssetUrl(path) {
  const base = new URL(api.defaults.baseURL, window.location.origin);
  return new URL(path, base).href;
}
