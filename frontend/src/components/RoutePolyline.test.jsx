import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CampusMap from "./CampusMap";
import RoutePolyline from "./RoutePolyline";

const mockMap = { invalidateSize: jest.fn(), fitBounds: jest.fn(), setView: jest.fn() };
jest.mock("leaflet", () => ({ divIcon: (options) => options }));
jest.mock("react-leaflet", () => {
  const React = require("react");
  const Context = React.createContext(null);
  return {
    MapContainer: ({ children }) => <Context.Provider value={{ ready: true }}><div className="map-container">{children}</div></Context.Provider>,
    TileLayer: () => null,
    Polyline: ({ positions, className }) => <div className={className} data-positions={JSON.stringify(positions)} />,
    Marker: ({ position, title, icon, children }) => <div className={icon.className} title={title} data-position={JSON.stringify(position)}>{children}</div>,
    Popup: ({ children }) => <div>{children}</div>,
    useMap: () => {
      if (!React.useContext(Context)) throw new Error("Route must be inside MapContainer");
      return mockMap;
    },
  };
});
const path = [
  { id: 1, latitude: 16.4735, longitude: 102.8236 },
  { id: 2, latitude: 16.4737, longitude: 102.8238 },
  { id: 3, latitude: 16.4728, longitude: 102.8241 },
];
let root, box;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
});
afterEach(async () => { await act(async () => root.unmount()); box.remove(); });
async function render(points, fitRequest = 0) {
  await act(async () => root.render(<CampusMap><RoutePolyline path={points} startLabel="ทางเข้า" endLabel="ห้อง 101" fitRequest={fitRequest} /></CampusMap>));
}

test("route mounts inside the map and draws ordered points with endpoint labels", async () => {
  await render(path);
  expect(JSON.parse(box.querySelector(".route-line").dataset.positions)).toEqual(path.map(n => [n.latitude, n.longitude]));
  expect(box.querySelector(".route-endpoint--start").title).toBe("จุดเริ่มต้น: ทางเข้า");
  expect(box.querySelector(".route-endpoint--end").title).toBe("จุดหมาย: ห้อง 101");
  expect(mockMap.fitBounds).toHaveBeenCalledWith(path.map(n => [n.latitude, n.longitude]), expect.objectContaining({ padding: [40, 40], maxZoom: 19 }));
});

test("empty route removes the old line and both markers", async () => {
  await render(path); await render([]);
  expect(box.querySelector(".route-line")).toBeNull();
  expect(box.querySelector(".route-endpoint")).toBeNull();
  expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
});

test("new route replaces old geometry and refits", async () => {
  await render(path); await render(path.slice(1));
  expect(JSON.parse(box.querySelector(".route-endpoint--start").dataset.position)).toEqual([16.4737, 102.8238]);
  expect(mockMap.fitBounds).toHaveBeenCalledTimes(2);
});

test("one-node route has one combined marker and a finite zoom", async () => {
  await render([path[0]]);
  expect(box.querySelector(".route-line")).toBeNull();
  expect(box.querySelectorAll(".route-endpoint")).toHaveLength(1);
  expect(box.querySelector(".route-endpoint--same")).not.toBeNull();
  expect(mockMap.setView).toHaveBeenCalledWith([16.4735, 102.8236], 19, { animate: false });
  expect(mockMap.fitBounds).not.toHaveBeenCalled();
});

test("co-located endpoints do not obscure each other's markers", async () => {
  await render([path[0], { ...path[0], id: 5 }]);
  expect(box.querySelectorAll(".route-endpoint")).toHaveLength(1);
  expect(mockMap.setView).toHaveBeenCalled();
});

test("unrelated rerender preserves panning; show-all request refits", async () => {
  await render(path); await render(path);
  expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
  await render(path, 1);
  expect(mockMap.fitBounds).toHaveBeenCalledTimes(2);
});
