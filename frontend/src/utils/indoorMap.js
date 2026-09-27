/** Floor coordinates start at the image's top left. Leaflet's Simple CRS points up. */
export function floorPosition(node, floor) {
  return [floor.height - node.y, node.x];
}

/** Keep separate visits to a floor separate; never connect through another floor. */
export function floorSegments(route, floorId) {
  const nodes = new Map((route?.path || []).map((node) => [node.id, node]));
  return (route?.segments || [])
    .filter((segment) => segment.floor_id === floorId)
    .map((segment) => segment.node_ids.map((id) => nodes.get(id)).filter((node) => node?.floor_id === floorId));
}
