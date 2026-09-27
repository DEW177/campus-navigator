import React, { act } from "react";
import { createRoot } from "react-dom/client";
import FloorMap from "./FloorMap";

const mockMap = { invalidateSize: jest.fn(), fitBounds: jest.fn(), on: jest.fn(), off: jest.fn() };
jest.mock("leaflet", () => ({ CRS: { Simple: {} }, divIcon: (options) => options }));
jest.mock("../services/mapService", () => ({ mapAssetUrl: (url) => url }));
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  ImageOverlay: () => null,
  Polyline: () => null,
  CircleMarker: () => null,
  Marker: ({ position, title, icon, children }) => <div className={icon.className} title={title} data-position={JSON.stringify(position)}>{children}</div>,
  Tooltip: ({ children }) => <span>{children}</span>,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => mockMap,
}));

test("room markers use floor coordinates, reject wrong floors and select the actual room", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const box = document.createElement("div"); document.body.appendChild(box);
  const root = createRoot(box);
  const select = jest.fn();
  const room = { id: 9, name: "DEMO-301", floor: 3, floor_id: 30, node_id: 100, navigation_scope: "room", navigation_node_id: 100, map_position: { x: 350, y: 240 } };
  try {
    await act(async () => root.render(<FloorMap floor={{ id: 30, width: 1000, height: 600 }}
      rooms={[room, { ...room, id: 10, floor_id: 20 }, { ...room, id: 11, map_position: null },
        { ...room, id: 12, map_position: { x: -1, y: 0 } }]}
      selectedRoomId={9} onSelectRoom={select} />));
    expect(box.querySelectorAll(".room-plan-marker")).toHaveLength(1);
    expect(box.querySelector(".room-plan-marker--selected").dataset.position).toBe("[360,350]");
    expect(box.querySelector(".room-plan-marker--selected").title).toBe("ดูห้อง DEMO-301");
    await act(async () => box.querySelector("button").click());
    expect(select).toHaveBeenCalledWith(room);
  } finally {
    await act(async () => root.unmount()); box.remove();
  }
});
