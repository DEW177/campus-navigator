import { floorPosition, floorSegments } from "./indoorMap";

test("floor image y coordinates are inverted once for Simple CRS", () => {
  expect(floorPosition({ x: 350, y: 240 }, { height: 600 })).toEqual([360, 350]);
  expect(floorPosition({ x: 0, y: 0 }, { height: 600 })).toEqual([600, 0]);
});

test("revisiting a floor must not draw a shortcut across floors", () => {
  const path = [
    { id: 1, floor_id: 1 }, { id: 2, floor_id: 1 },
    { id: 3, floor_id: 2 }, { id: 4, floor_id: 2 },
    { id: 5, floor_id: 1 }, { id: 6, floor_id: 1 },
  ];
  const route = { path, segments: [
    { floor_id: 1, node_ids: [1, 2] }, { floor_id: 2, node_ids: [3, 4] }, { floor_id: 1, node_ids: [5, 6] },
  ] };
  expect(floorSegments(route, 1)).toEqual([path.slice(0, 2), path.slice(4)]);
  expect(floorSegments(null, 1)).toEqual([]);
});
