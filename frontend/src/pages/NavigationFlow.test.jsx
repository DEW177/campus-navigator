import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import App from "../App";
import api from "../services/api";
jest.mock("../services/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../components/CampusMap", () => () => <div />);
jest.mock("../components/LocationMarkers", () => () => null);
jest.mock("../components/FloorMap", () => ({ floor, route }) => <div data-testid="floor-map" data-floor={floor.id} data-route={!!route} />);
const room = { id: 10, name: "SC06-301", floor: 3, node_id: 3, building_id: 1,
  navigation_scope: "entrance", navigation_node_id: 3, navigation_label: "ทางเข้า SC06", is_demo: true,
  entrance: { node_id: 3, label: "ทางเข้า SC06", floor_id: null, floor: 1, latitude: 16.4735, longitude: 102.8236 } };
const indoorRoom = { ...room, name: "DEMO-301", floor_id: 33, building_id: 2,
  navigation_scope: "room", navigation_label: "DEMO-301",
  entrance: { node_id: 20, label: "ทางเข้าอาคารทดลอง", floor_id: 31, floor: 1, latitude: null, longitude: null } };
const indoorFloors = [1, 2, 3].map((number) => ({ id: 30 + number, name: `ชั้น ${number}`, number }));
const indoorRoute = {
  map_type: "indoor", is_demo: true, total_distance: 36.5,
  path: [{ id: 20, floor_id: 31 }, { id: 21, floor_id: 32 }, { id: 3, floor_id: 33 }],
  segments: [31, 32, 33].map((floor_id) => ({ floor_id, node_ids: [] })),
  directions: [{ kind: "stairs", text: "ขึ้นบันไดจากชั้น 1 ไปชั้น 2", floor_id: 31, target_floor_id: 32 }],
};
const deviceFix = { coords: { latitude: 16.2, longitude: 102.6, accuracy: 15 } };
let box, root, geolocation;
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  geolocation = { getCurrentPosition: jest.fn((success) => success(deviceFix)) };
  Object.defineProperty(navigator, "geolocation", { value: geolocation, configurable: true });
  api.get.mockImplementation((url) => {
    if (url === "/rooms/") return Promise.resolve({ data: [room] });
    if (url === "/rooms/10") return Promise.resolve({ data: room });
    return Promise.reject({ response: { status: 404 } });
  });
  api.post.mockResolvedValue({ data: indoorRoute });
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
});
afterEach(async () => { await act(async () => root.unmount()); box.remove(); });
async function open(url) { window.history.replaceState({}, "", url); await act(async () => root.render(<App />)); }
function button(label) { return [...box.querySelectorAll("button")].find((n) => n.textContent === label); }
async function click(label) { await act(async () => button(label).click()); }
async function submit() { await act(async () => Simulate.submit(box.querySelector("form"))); }
async function search(value) { await act(async () => Simulate.change(box.querySelector("input"), { target: { value } })); }
async function mode(value) { await act(async () => Simulate.change(box.querySelector("#route-mode"), { target: { value } })); }
async function reloadApp() { await act(async () => root.unmount()); root = createRoot(box); await act(async () => root.render(<App />)); }
function useIndoorApi(selected = indoorRoom) {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/floors/" ? indoorFloors : selected }));
}

test("search -> room -> device location without a start picker or node request", async () => {
  await open("/"); await search("SC06");
  await click("ไปทางเข้าอาคาร");
  expect(new URLSearchParams(window.location.search).get("room")).toBe("10");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("SC06");
  expect(box.textContent).toContain("ปลายทาง: SC06-301");
  expect(box.querySelector("#start-location")).toBeNull();
  expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(api.get.mock.calls.some(([url]) => url === "/navigate/nodes")).toBe(false);
  await click("นำทางจากตำแหน่งของฉัน");
  const link = new URL(box.querySelector('a[href*="/maps/dir/"]').href);
  expect(link.searchParams.get("origin")).toBe("16.2,102.6");
  expect(link.searchParams.get("destination")).toBe("16.4735,102.8236");
  expect(link.searchParams.has("travelmode")).toBe(false);
  expect(api.post).not.toHaveBeenCalled(); // arbitrary GPS coordinates are not graph IDs
  expect(window.location.search).not.toMatch(/16\.2|102\.6/);
  expect(localStorage.length + sessionStorage.length).toBe(0);
});

test.each(["/navigate", "/navigate?room=abc", "/navigate?room=-1"])("invalid link %s leads to search", async (url) => {
  await open(url); expect(box.textContent).toContain("กรุณาค้นหาและเลือกห้อง");
  expect(box.querySelector('a[href="/"]')).not.toBeNull(); expect(api.get).not.toHaveBeenCalled();
});
test("saved room URL restores destination without prompting for GPS", async () => {
  await open("/navigate?room=10"); expect(box.textContent).toContain("ปลายทาง: SC06-301");
  expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
});
test("deleted room has recovery message", async () => {
  await open("/navigate?room=999"); expect(box.querySelector('[role="alert"]').textContent).toContain("ไม่พบห้อง");
});
test("room without a mapped entrance does not invent one", async () => {
  api.get.mockResolvedValue({ data: { ...room, entrance: null, navigation_node_id: null, navigation_scope: "unavailable" } });
  await open("/navigate?room=10");
  expect(box.textContent).toContain("ยังไม่มีข้อมูลเส้นทาง");
  expect(button("นำทางจากตำแหน่งของฉัน")).toBeUndefined();
  expect(api.post).not.toHaveBeenCalled();
});
test("mapped building is still reachable when the classroom door is not surveyed", async () => {
  api.get.mockResolvedValue({ data: [{ ...room, navigation_node_id: null, navigation_scope: "unavailable" }] });
  await open("/"); expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});
test("entrance-only coverage stays explicit when using current location", async () => {
  await open("/navigate?room=10");
  expect(box.textContent).toContain("นำทางได้ถึงทางเข้าอาคารเท่านั้น");
  expect(box.textContent).toContain("ยังไม่มีเส้นทางภายในอาคารไปถึงประตูห้อง SC06-301 ชั้น 3");
  await click("นำทางจากตำแหน่งของฉัน");
  expect(box.textContent).toContain("เปิดเส้นทางไปพิกัดตัวอย่างใน Google Maps");
  expect(box.textContent).not.toContain("จุดเริ่มต้นและจุดหมายเป็นจุดเดียวกัน");
});

test.each([[1, "ยังไม่ได้รับอนุญาต"], [2, "หาตำแหน่งไม่ได้"], [3, "หาตำแหน่งนานเกินไป"]])("GPS failure %s has retry and preserves building browsing", async (code, message) => {
  geolocation.getCurrentPosition.mockImplementationOnce((success, fail) => fail({ code }));
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  expect(box.querySelector('[role="alert"]').textContent).toContain(message);
  expect(box.querySelector('a[href*="/maps/dir/"]')).toBeNull();
  expect(box.querySelector('a[href*="/maps/search/"]')).not.toBeNull();
  expect(button("ดูผังอาคารทดลอง")).toBeDefined();
  await click("ลองหาตำแหน่งอีกครั้ง");
  expect(box.textContent).toContain("พบตำแหน่งของคุณแล้ว");
});
test("HTTP on a phone explains HTTPS without requesting unavailable geolocation", async () => {
  Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  expect(box.textContent).toContain("กรุณาเปิดเว็บผ่าน HTTPS บนมือถือ");
  expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(box.querySelector('a[href*="/maps/search/"]')).not.toBeNull();
});
test("unsupported browser retains the destination map", async () => {
  Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true });
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  expect(box.textContent).toContain("เบราว์เซอร์นี้ไม่รองรับ");
});
test("invalid coordinates cannot be sent to Google Maps", async () => {
  geolocation.getCurrentPosition.mockImplementationOnce((success) => success({ coords: { latitude: NaN, longitude: 102, accuracy: 10 } }));
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  expect(box.textContent).toContain("หาตำแหน่งไม่ได้");
  expect(box.querySelector('a[href*="/maps/dir/"]')).toBeNull();
});
test("inaccurate location is disclosed and can be refreshed", async () => {
  geolocation.getCurrentPosition.mockImplementationOnce((success) => success({ coords: { ...deviceFix.coords, accuracy: 1500 } }));
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  expect(box.textContent).toContain("ตำแหน่งยังคลาดเคลื่อนมาก");
  await click("อัปเดตตำแหน่งของฉัน");
  expect(box.textContent).not.toContain("ตำแหน่งยังคลาดเคลื่อนมาก");
});
test("cancel ignores late GPS success", async () => {
  let resolve; geolocation.getCurrentPosition.mockImplementationOnce((success) => { resolve = success; });
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  await click("ยกเลิกการหาตำแหน่ง");
  await act(async () => resolve(deviceFix));
  expect(box.querySelector('a[href*="/maps/dir/"]')).toBeNull();
  expect(button("นำทางจากตำแหน่งของฉัน").disabled).toBe(false);
});
test("refresh forgets old device coordinates and waits for a new user action", async () => {
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  await reloadApp();
  expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(box.querySelector('a[href*="/maps/dir/"]')).toBeNull();
  expect(button("นำทางจากตำแหน่งของฉัน")).toBeDefined();
});
test("leaving a room ignores late device fixes", async () => {
  let resolve; geolocation.getCurrentPosition.mockImplementationOnce((success) => { resolve = success; });
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  await act(async () => box.querySelector('a[href="/"]').click());
  await act(async () => resolve(deviceFix));
  expect(window.location.pathname).toBe("/");
  expect(box.textContent).not.toContain("พบตำแหน่งของคุณแล้ว");
});

test("demo starts at its designated entrance with no GPS or start selection", async () => {
  useIndoorApi(); await open("/navigate?room=10");
  expect(box.textContent).toContain("ไม่มีพิกัดสำหรับเดินทางจริง");
  expect(box.querySelector("#start-location")).toBeNull();
  expect(button("นำทางจากตำแหน่งของฉัน")).toBeUndefined();
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("33");
  await submit();
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", { start_node_id: 20, end_node_id: 3, route_mode: "shortest" }, expect.anything());
  expect(box.textContent).toContain("ระยะทางจำลองในอาคาร: 36.5 เมตร");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("31");
  await click("ดูชั้นที่ไปถึง");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("32");
  expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
});
test("real indoor building uses the same entrance for Google Maps and the indoor path", async () => {
  useIndoorApi({ ...indoorRoom, is_demo: false, entrance: { ...indoorRoom.entrance, latitude: 16.5, longitude: 102.9 } });
  await open("/navigate?room=10"); await click("นำทางจากตำแหน่งของฉัน");
  expect(new URL(box.querySelector('a[href*="/maps/dir/"]').href).searchParams.get("destination")).toBe("16.5,102.9");
  expect(api.post).not.toHaveBeenCalled(); // obtaining GPS is not an indoor arrival
  await click("ดูเส้นทางจากทางเข้าไปห้อง");
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", expect.objectContaining({ start_node_id: 20 }), expect.anything());
});
test("missing indoor entrance leaves plans visible without guessing a start", async () => {
  useIndoorApi({ ...indoorRoom, entrance: null }); await open("/navigate?room=10&route=1");
  expect(box.textContent).toContain("ยังไม่มีข้อมูลทางเข้าที่เชื่อมไปห้องนี้");
  expect(box.querySelector('[data-testid="floor-map"]')).not.toBeNull();
  expect(api.post).not.toHaveBeenCalled();
});
test("changing mode clears a route and uses the entrance again", async () => {
  useIndoorApi(); await open("/navigate?room=10"); await submit(); await mode("elevator");
  expect(box.textContent).not.toContain("36.5 เมตร");
  expect(new URLSearchParams(window.location.search).has("route")).toBe(false);
  await submit();
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", { start_node_id: 20, end_node_id: 3, route_mode: "elevator" }, expect.anything());
});
test("mode change cancels pending routes and ignores late results", async () => {
  useIndoorApi(); let resolve; api.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await open("/navigate?room=10"); await submit();
  const signal = api.post.mock.calls[0][2].signal; await mode("elevator"); expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: indoorRoute }));
  expect(box.querySelector('[data-testid="floor-map"]').dataset.route).toBe("false");
});
test.each([["ROUTE_NOT_FOUND", "ไม่พบเส้นทางจากทางเข้า"], ["NODE_NOT_FOUND", "ข้อมูลทางเข้าหรือห้องเปลี่ยนไป"]])("indoor %s supports retry", async (code, message) => {
  useIndoorApi(); api.post.mockRejectedValueOnce({ response: { data: { detail: { code } } } });
  await open("/navigate?room=10"); await submit();
  expect(box.querySelector('[role="alert"]').textContent).toContain(message);
  await submit(); expect(box.textContent).toContain("36.5 เมตร");
});
test("refresh retains mode and viewed floor but recomputes the indoor route", async () => {
  useIndoorApi(); await open("/navigate?room=10&q=DEMO"); await mode("stairs"); await submit();
  await click("ดูชั้นที่ไปถึง"); expect(api.post).toHaveBeenCalledTimes(1);
  await reloadApp();
  expect(box.querySelector("#route-mode").value).toBe("stairs");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("32");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("DEMO");
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
});
test("refresh before requesting a route does not calculate", async () => {
  useIndoorApi(); await open("/navigate?room=10"); await mode("elevator"); await reloadApp();
  expect(box.querySelector("#route-mode").value).toBe("elevator"); expect(api.post).not.toHaveBeenCalled();
});
test("old start links do not silently recalculate from a different point", async () => {
  useIndoorApi(); await open("/navigate?room=10&start=999&route=1");
  await act(async () => [...box.querySelectorAll(".floor-selector button")].find((b) => b.textContent === "ชั้น 2").click());
  expect(api.post).not.toHaveBeenCalled(); await submit();
  expect(new URLSearchParams(window.location.search).has("start")).toBe(false);
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", expect.objectContaining({ start_node_id: 20 }), expect.anything());
});
test("invalid saved mode requires a new route action", async () => {
  useIndoorApi(); await open("/navigate?room=10&mode=unknown&route=1");
  expect(box.textContent).toContain("ตัวเลือกเส้นทางเดิมไม่ถูกต้อง"); expect(api.post).not.toHaveBeenCalled();
  await submit(); expect(api.post).toHaveBeenCalled();
});
test("newly closed indoor path is not restored as cached geometry", async () => {
  useIndoorApi(); await open("/navigate?room=10"); await submit();
  api.post.mockRejectedValue({ response: { data: { detail: { code: "ROUTE_NOT_FOUND" } } } });
  await reloadApp(); expect(box.textContent).toContain("ไม่พบเส้นทางจากทางเข้า");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.route).toBe("false");
});
test("floor loading failure supports retry", async () => {
  useIndoorApi(); const implementation = api.get.getMockImplementation();
  api.get.mockImplementation((url, options) => url === "/floors/" ? Promise.reject(new Error("offline")) : implementation(url, options));
  await open("/navigate?room=10"); expect(box.textContent).toContain("โหลดข้อมูลสำหรับนำทางไม่ได้");
  useIndoorApi(); await click("ลองอีกครั้ง"); expect(box.querySelector('[data-testid="floor-map"]')).not.toBeNull();
});

test("home offers search immediately", async () => {
  await open("/"); expect(box.querySelector("h1").textContent).toBe("จะไปห้องไหน?");
  expect(box.querySelector('label[for="room-search"]')).not.toBeNull(); expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});
test("legacy search link preserves the query", async () => {
  await open("/search?q=SC06"); expect(window.location.pathname).toBe("/"); expect(box.querySelector("input").value).toBe("SC06");
});
test("choosing another room returns to the search", async () => {
  await open("/?q=SC06"); await click("ไปทางเข้าอาคาร");
  await act(async () => box.querySelector('a[href="/?q=SC06"]').click());
  expect(box.querySelector("input").value).toBe("SC06");
});
test("search network error supports retry", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")); await open("/");
  expect(box.textContent).toContain("โหลดรายการห้องไม่ได้"); await click("ลองอีกครั้ง"); expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});
test("empty search offers guidance and can be cleared", async () => {
  api.get.mockResolvedValueOnce({ data: [] }); await open("/?q=missing"); expect(box.textContent).toContain("ไม่พบห้อง");
  await click("ดูห้องทั้งหมด"); expect(box.querySelector("input").value).toBe(""); expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});
test("old search cannot replace the latest result", async () => {
  let resolve; api.get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await open("/"); await search("SC06"); await act(async () => resolve({ data: [{ ...room, name: "OLD ROOM" }] }));
  expect(box.textContent).not.toContain("OLD ROOM"); expect(box.textContent).toContain("SC06-301");
});
test("search follows browser history", async () => {
  await open("/?q=SC06"); await act(async () => {
    window.history.replaceState({}, "", "/?q=RC01"); window.dispatchEvent(new PopStateEvent("popstate"));
  }); expect(box.querySelector("input").value).toBe("RC01");
});

const demoBuilding = { id: 2, code: "DEMO", name: "อาคารทดลอง 3 ชั้น", is_demo: true };
const planRooms = [1, 2, 3].map((number) => ({ ...indoorRoom, id: 100 + number,
  name: `DEMO-${number}01`, floor: number, floor_id: 30 + number, node_id: 200 + number,
  navigation_node_id: 200 + number, navigation_label: `DEMO-${number}01`,
  building_name: demoBuilding.name, map_position: { x: 350, y: 240 } }));
function usePlanApi() {
  api.get.mockImplementation((url, options) => {
    if (url === "/buildings/") return Promise.resolve({ data: [demoBuilding] });
    if (url === "/floors/") return Promise.resolve({ data: indoorFloors });
    if (url === "/rooms/") return Promise.resolve({ data: options?.params?.building_id ? planRooms : [room] });
    if (url === "/rooms/10") return Promise.resolve({ data: room });
    if (url.startsWith("/rooms/")) return Promise.resolve({ data: planRooms.find((item) => String(item.id) === url.split("/").pop()) });
    return Promise.reject(new Error("Unknown URL"));
  });
}
test("outdoor page opens plans inline and closing preserves the device fix", async () => {
  usePlanApi(); await open("/navigate?room=10&q=SC06"); await click("นำทางจากตำแหน่งของฉัน");
  const link = box.querySelector('a[href*="/maps/dir/"]').href;
  await click("ดูผังอาคารทดลอง"); expect(box.querySelector("dialog").textContent).toContain("แยกจากปลายทาง SC06-301");
  await click("กลับไปแผนที่"); expect(box.querySelector("dialog")).toBeNull();
  expect(box.querySelector('a[href*="/maps/dir/"]').href).toBe(link);
  expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
});
test("selecting a room from its plan preserves search and discards old route choices", async () => {
  usePlanApi(); await open("/navigate?room=10&q=SC06&start=1&route=1"); await click("ดูผังอาคารทดลอง");
  await act(async () => [...box.querySelectorAll("dialog .floor-selector button")].find((b) => b.textContent === "ชั้น 3").click());
  await click("ไปห้องนี้");
  expect(box.querySelector("dialog")).toBeNull(); expect(new URLSearchParams(window.location.search).get("room")).toBe("103");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("SC06"); expect(new URLSearchParams(window.location.search).has("route")).toBe(false);
  expect(button("ทดลองเส้นทางจากทางเข้า")).toBeDefined();
});
test("indoor plan opens on the destination floor", async () => {
  usePlanApi(); await open("/navigate?room=103"); await click("ดูผังชั้น 3 · ห้อง DEMO-301");
  expect(box.querySelector('dialog [data-testid="floor-map"]').dataset.floor).toBe("33");
  expect(api.get.mock.calls.some(([url]) => url === "/buildings/")).toBe(false);
});
test("home plan browser preserves search on close", async () => {
  usePlanApi(); await open("/?q=SC06"); await click("ดูผังอาคารทดลอง");
  expect(box.querySelector("dialog").textContent).toContain("DEMO-101"); await click("กลับไปค้นหาห้อง");
  expect(box.querySelector("input").value).toBe("SC06");
});
test("plan browser supports retry", async () => {
  usePlanApi(); await open("/navigate?room=10"); api.get.mockRejectedValueOnce(new Error("offline"));
  await click("ดูผังอาคารทดลอง"); expect(box.querySelector('dialog [role="alert"]').textContent).toContain("โหลดผังอาคารไม่ได้");
  await click("ลองอีกครั้ง"); expect(box.querySelector('dialog [data-testid="floor-map"]')).not.toBeNull();
});
test("missing demo building explains why the plan is unavailable", async () => {
  usePlanApi(); await open("/navigate?room=10"); api.get.mockResolvedValueOnce({ data: [] });
  await click("ดูผังอาคารทดลอง"); expect(box.textContent).toContain("ยังไม่มีอาคารทดลองให้ดู");
});
test("closing a loading plan ignores late data", async () => {
  usePlanApi(); await open("/navigate?room=10"); let resolve;
  api.get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await click("ดูผังอาคารทดลอง"); const signal = api.get.mock.calls.at(-1)[1].signal;
  await click("กลับไปแผนที่"); expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: [demoBuilding] })); expect(box.querySelector("dialog")).toBeNull();
});
