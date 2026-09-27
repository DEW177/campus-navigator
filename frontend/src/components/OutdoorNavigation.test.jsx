import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import OutdoorNavigation from "./OutdoorNavigation";
import api from "../services/api";
jest.mock("../services/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("./CampusMap", () => ({ children }) => <div>{children}</div>);
jest.mock("./LocationMarkers", () => ({ position, route }) => <div data-testid="markers"
  data-position={JSON.stringify(position)} data-route={JSON.stringify(route)} />);
jest.mock("./MapStartPicker", () => ({ active, onPick }) => active ? <button onClick={() => onPick({
  latitude: 16.45, longitude: 102.8, label: "จุดที่เลือกบนแผนที่", source: "pin",
})}>จำลองแตะแผนที่</button> : null);
const entrance = { latitude: 16.4735, longitude: 102.8236, label: "ทางเข้าอาคาร", node_id: 3 };
const place = { label: "หอพัก ขอนแก่น", latitude: 16.45, longitude: 102.8, attribution: "© OpenStreetMap contributors" };
const path = { geometry: { type: "MultiLineString", coordinates: [[[102.8, 16.45], [102.82, 16.47], [102.8236, 16.4735]]] },
  distance_m: 1200, duration_s: 800, mode: "walk", start_gap_m: 0, end_gap_m: 0 };
let root, box;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition: jest.fn((ok) => ok({ coords: { latitude: 16.44, longitude: 102.81, accuracy: 12 } })),
  } });
  api.get.mockResolvedValue({ data: { configured: true } });
  api.post.mockImplementation((url) => Promise.resolve({ data: url.endsWith("/search") ? { results: [place] } : path }));
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
});
afterEach(async () => { await act(async () => root.unmount()); box.remove(); });
async function open() { await act(async () => root.render(<OutdoorNavigation buildingId={1} entrance={entrance} isDemo={false} hasIndoorRoute />)); }
function button(label) { return [...box.querySelectorAll("button")].find((node) => node.textContent === label); }
async function click(label) { await act(async () => button(label).click()); }
async function type(text) { await act(async () => Simulate.change(box.querySelector("#origin-search"), { target: { value: text } })); }
async function submit() { await act(async () => Simulate.submit(box.querySelector("form"))); }
async function selectPlace() {
  await click("ค้นหาสถานที่หรือที่อยู่"); await type("หอพัก ขอนแก่น"); await submit();
  await click(place.label); await click("ใช้จุดนี้เป็นจุดเริ่มต้น");
}
function routeShown() { return box.querySelector('[data-testid="markers"]').dataset.route !== "null"; }

test("typing never searches; submit normalizes and suppresses duplicate queries", async () => {
  await open(); await click("ค้นหาสถานที่หรือที่อยู่"); await type("หอ"); await type(" หอพัก   ขอนแก่น ");
  expect(api.post).not.toHaveBeenCalled();
  await submit(); await submit();
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith("/outdoor/search", { query: "หอพัก ขอนแก่น", building_id: 1 }, expect.anything());
  expect(box.textContent).toContain("Powered by");
});
test("search selection requires confirmation, then draws the route on request", async () => {
  await open(); await click("ค้นหาสถานที่หรือที่อยู่"); await type("หอพัก"); await submit(); await click(place.label);
  expect(button("ดูเส้นทางบนแผนที่")).toBeUndefined();
  expect(box.querySelector('a[href*="/maps/dir/"]')).toBeNull();
  await click("ใช้จุดนี้เป็นจุดเริ่มต้น");
  expect(api.post).toHaveBeenCalledTimes(1);
  await click("ดูเส้นทางบนแผนที่");
  expect(api.post).toHaveBeenLastCalledWith("/outdoor/route", { origin: { latitude: 16.45, longitude: 102.8 }, building_id: 1, mode: "walk" }, expect.anything());
  expect(routeShown()).toBe(true);
  expect(box.textContent).toContain("1.2 กม."); expect(box.textContent).toContain("14 นาที");
  expect(box.textContent).toContain("หมุดไม่ติดตามสด");
  expect(button("แสดงเส้นทางแล้ว").disabled).toBe(true);
});
test("missing key leaves manual pin and Google Maps usable", async () => {
  api.get.mockResolvedValue({ data: { configured: false } });
  await open(); await click("เลือกจุดบนแผนที่"); await click("จำลองแตะแผนที่");
  expect(box.textContent).toContain("ไม่ใช่ตำแหน่งที่ตรวจพบจากเครื่อง");
  await click("ใช้จุดนี้เป็นจุดเริ่มต้น");
  expect(button("ดูเส้นทางบนแผนที่").disabled).toBe(true);
  const link = new URL(box.querySelector('a[href*="/maps/dir/"]').href);
  expect(link.searchParams.get("origin")).toBe("16.45,102.8");
  expect(link.searchParams.get("destination")).toBe("16.4735,102.8236");
  expect(api.post).not.toHaveBeenCalled();
});
test("new origin or mode clears the route and Google uses the selected mode", async () => {
  await open(); await selectPlace(); await click("ดูเส้นทางบนแผนที่");
  await act(async () => Simulate.change(box.querySelector("#outdoor-mode"), { target: { value: "drive" } }));
  expect(routeShown()).toBe(false);
  expect(new URL(box.querySelector('a[href*="/maps/dir/"]').href).searchParams.get("travelmode")).toBe("driving");
  await click("ดูเส้นทางบนแผนที่");
  expect(api.post.mock.calls.at(-1)[1].mode).toBe("drive");
  await click("เปลี่ยนจุดเริ่มต้น"); expect(routeShown()).toBe(false);
  expect(box.querySelector('a[href*="/maps/dir/"]')).toBeNull();
});
test("late route cannot reappear after changing mode", async () => {
  await open(); await selectPlace();
  let resolve; api.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await click("ดูเส้นทางบนแผนที่"); const signal = api.post.mock.calls.at(-1)[2].signal;
  await act(async () => Simulate.change(box.querySelector("#outdoor-mode"), { target: { value: "drive" } }));
  expect(signal.aborted).toBe(true); await act(async () => resolve({ data: path }));
  expect(routeShown()).toBe(false);
});
test("double submitting pending search sends only one request", async () => {
  api.post.mockImplementationOnce(() => new Promise(() => {}));
  await open(); await click("ค้นหาสถานที่หรือที่อยู่"); await type("ขอนแก่น");
  await act(async () => { Simulate.submit(box.querySelector("form")); Simulate.submit(box.querySelector("form")); });
  expect(api.post).toHaveBeenCalledTimes(1);
});
test("editing search cancels old response before it can replace results", async () => {
  let resolve; api.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await open(); await click("ค้นหาสถานที่หรือที่อยู่"); await type("old search"); await submit();
  await type("new search"); await submit(); await act(async () => resolve({ data: { results: [{ ...place, label: "OLD RESULT" }] } }));
  expect(box.textContent).not.toContain("OLD RESULT"); expect(box.textContent).toContain(place.label);
});
test("GPS callback after choosing a pin is ignored", async () => {
  let resolve; navigator.geolocation.getCurrentPosition.mockImplementation((ok) => { resolve = ok; });
  await open(); await click("นำทางจากตำแหน่งของฉัน");
  await click("เลือกจุดบนแผนที่"); await click("จำลองแตะแผนที่"); await click("ใช้จุดนี้เป็นจุดเริ่มต้น");
  await act(async () => resolve({ coords: { latitude: 10, longitude: 100, accuracy: 1 } }));
  expect(new URL(box.querySelector('a[href*="/maps/dir/"]').href).searchParams.get("origin")).toBe("16.45,102.8");
  expect(box.textContent).not.toContain("พบตำแหน่งของคุณแล้ว");
});
test.each(["NOT_CONFIGURED", "DAILY_LIMIT", "PROVIDER_LIMIT", "PROVIDER_TIMEOUT", "ROUTE_NOT_FOUND"])("%s offers recovery without a fake route", async (code) => {
  await open(); await selectPlace();
  api.post.mockRejectedValueOnce({ response: { data: { detail: { code } } } });
  await click("ดูเส้นทางบนแผนที่");
  expect(box.querySelector('[role="alert"]')).not.toBeNull(); expect(routeShown()).toBe(false);
  expect(box.querySelector('a[href*="/maps/dir/"]')).not.toBeNull();
  await click("ดูเส้นทางบนแผนที่"); expect(routeShown()).toBe(true);
});
test("empty search offers manual selection", async () => {
  api.post.mockResolvedValueOnce({ data: { results: [] } });
  await open(); await click("ค้นหาสถานที่หรือที่อยู่"); await type("unknown"); await submit();
  expect(box.textContent).toContain("ไม่พบสถานที่"); expect(button("เลือกจุดบนแผนที่")).toBeDefined();
});
test("snapped road gap is disclosed and indoor section remains a separate next step", async () => {
  await open(); await selectPlace(); api.post.mockResolvedValueOnce({ data: { ...path, end_gap_m: 125 } });
  await click("ดูเส้นทางบนแผนที่");
  expect(box.textContent).toContain("ปลายเส้นทางห่างจากทางเข้าอาคาร 125 เมตร");
  expect(box.textContent).toContain("จากทางเข้าไปห้องเรียน");
});
