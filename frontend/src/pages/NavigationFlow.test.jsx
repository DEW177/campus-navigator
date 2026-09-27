import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import App from "../App";
import api from "../services/api";
jest.mock("../services/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../components/CampusMap", () => () => <div />);
jest.mock("../components/RoutePolyline", () => () => null);
jest.mock("../components/FloorMap", () => ({ floor, route }) => <div data-testid="floor-map" data-floor={floor.id} data-route={!!route} />);
const room = { id: 10, name: "SC06-301", floor: 3, node_id: 3, building_id: 1,
  navigation_scope: "entrance", navigation_node_id: 3, navigation_label: "ทางเข้า SC06", is_demo: true };
const nodes = [{ id: 1, label: "ทางเข้า SC06", floor: 1 }, { id: 2, label: "ทางแยก", floor: 1 }];
let box, root;
beforeAll(() => {
  // jsdom lacks native dialog methods; browser QA covers the modal focus behavior.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  api.get.mockImplementation((url) => {
    if (url === "/rooms/") return Promise.resolve({ data: [room] });
    if (url === "/rooms/10") return Promise.resolve({ data: room });
    if (url === "/navigate/nodes") return Promise.resolve({ data: nodes });
    return Promise.reject({ response: { status: 404 } });
  });
  api.post.mockResolvedValue({ data: { path: [{ id: 1 }, { id: 3 }], total_distance: 85 } });
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
});
afterEach(async () => { await act(async () => root.unmount()); box.remove(); });
async function open(url) { window.history.replaceState({}, "", url); await act(async () => root.render(<App />)); }
function button(label) { return [...box.querySelectorAll("button")].find((n) => n.textContent === label); }
async function choose(value) { await act(async () => { const s = box.querySelector("select"); s.value = value; Simulate.change(s); }); }
async function submit() { await act(async () => Simulate.submit(box.querySelector("form"))); }
async function search(value) { await act(async () => Simulate.change(box.querySelector("input"), { target: { value } })); }

test("search -> room -> named start -> numeric IDs and distance", async () => {
  await open("/"); await search("SC06");
  expect(api.get).toHaveBeenLastCalledWith("/rooms/", expect.objectContaining({ params: { search: "SC06" } }));
  await act(async () => button("ไปทางเข้าอาคาร").click());
  expect(new URLSearchParams(window.location.search).get("room")).toBe("10");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("SC06");
  expect(box.textContent).toContain("ปลายทาง: SC06-301");
  expect(button("ค้นหาเส้นทาง").disabled).toBe(true);
  expect(box.textContent).toContain("ทางเข้า SC06");
  await choose("1"); await submit();
  expect(api.post).toHaveBeenCalledWith("/navigate/", { start_node_id: 1, end_node_id: 3, route_mode: "shortest" }, expect.objectContaining({ signal: expect.anything() }));
  expect(box.textContent).toContain("85.0 เมตร");
  await choose("2"); expect(box.textContent).not.toContain("85.0 เมตร");
});
test("saved room URL restores destination", async () => {
  await open("/navigate?room=10"); expect(box.textContent).toContain("ปลายทาง: SC06-301");
  expect(api.get).toHaveBeenCalledWith("/rooms/10", expect.anything());
});
test.each(["/navigate", "/navigate?room=abc", "/navigate?room=-1"])("invalid link %s leads to search", async (url) => {
  await open(url); expect(box.textContent).toContain("กรุณาค้นหาและเลือกห้อง");
  expect(box.querySelector('a[href="/"]')).not.toBeNull(); expect(api.get).not.toHaveBeenCalled();
});
test("deleted room has recovery message", async () => {
  await open("/navigate?room=999"); expect(box.querySelector('[role="alert"]').textContent).toContain("ไม่พบห้อง");
});
test("room without node cannot request a route", async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/navigate/nodes" ? nodes : { ...room, node_id: null, navigation_node_id: null, navigation_scope: "unavailable" } }));
  await open("/navigate?room=10"); expect(box.textContent).toContain("ยังไม่มีข้อมูลเส้นทาง");
  expect(box.querySelector("form")).toBeNull(); expect(api.post).not.toHaveBeenCalled();
});
test("empty locations explain unavailable navigation", async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/navigate/nodes" ? [] : room }));
  await open("/navigate?room=10"); expect(box.textContent).toContain("ยังไม่มีจุดเริ่มต้นให้เลือก");
  expect(box.querySelector("form")).toBeNull();
});
test.each([["ROUTE_NOT_FOUND", "ไม่พบเส้นทางจากจุดนี้"], ["NODE_NOT_FOUND", "จุดเริ่มต้นหรือจุดหมายไม่มีในระบบแล้ว"]])("%s displays error and supports retry", async (code, message) => {
  api.post.mockRejectedValueOnce({ response: { data: { detail: { code } } } });
  await open("/navigate?room=10"); await choose("1"); await submit();
  expect(box.querySelector('[role="alert"]').textContent).toContain(message);
  expect(button("ค้นหาเส้นทาง").disabled).toBe(false); await submit();
  expect(box.querySelector('[role="alert"]')).toBeNull(); expect(box.textContent).toContain("85.0 เมตร");
});
test("changing start cancels pending route and ignores late result", async () => {
  let resolve; api.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await open("/navigate?room=10"); await choose("1"); await submit();
  expect(button("กำลังคำนวณ...").disabled).toBe(true);
  const signal = api.post.mock.calls[0][2].signal; await choose("2"); expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: { path: [], total_distance: 999 } }));
  expect(box.textContent).not.toContain("999.0"); expect(button("ค้นหาเส้นทาง").disabled).toBe(false);
});
test("zero distance is explicit", async () => {
  api.post.mockResolvedValueOnce({ data: { path: [{ id: 3 }], total_distance: 0 } });
  await open("/navigate?room=10"); await choose("1"); await submit();
  expect(box.textContent).toContain("จุดเริ่มต้นที่เลือกอยู่ที่ทางเข้าอาคาร ยังไม่ใช่ประตูห้อง");
  expect(box.textContent).not.toContain("จุดเริ่มต้นและจุดหมายเป็นจุดเดียวกัน");
});
test("search network error can retry", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")); await open("/search");
  expect(box.querySelector('[role="alert"]').textContent).toContain("โหลดรายการห้องไม่ได้");
  await act(async () => button("ลองอีกครั้ง").click()); expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});
test("empty search result offers guidance", async () => {
  api.get.mockResolvedValueOnce({ data: [] }); await open("/"); expect(box.textContent).toContain("ยังไม่มีห้องในระบบ");
});
test("old search cannot replace latest search", async () => {
  let resolve; api.get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await open("/search"); await search("SC06");
  await act(async () => resolve({ data: [{ ...room, name: "OLD ROOM" }] }));
  expect(box.textContent).toContain("SC06-301"); expect(box.textContent).not.toContain("OLD ROOM");
});


test("home offers room search and selection immediately", async () => {
  await open("/");
  expect(box.querySelector("h1").textContent).toBe("จะไปห้องไหน?");
  expect(box.querySelector('label[for="room-search"]')).not.toBeNull();
  expect(box.querySelector("input")).not.toBeNull();
  expect(button("ไปทางเข้าอาคาร")).toBeDefined();
  expect(window.location.pathname).toBe("/");
  expect(box.querySelector('a[href="/navigate"]')).toBeNull();
});

test("legacy search URL redirects home and preserves its query", async () => {
  await open("/search?q=SC06");
  expect(window.location.pathname).toBe("/");
  expect(box.querySelector("input").value).toBe("SC06");
  expect(api.get).toHaveBeenCalledWith("/rooms/", expect.objectContaining({ params: { search: "SC06" } }));
});

test("choose another room returns home with the original search", async () => {
  await open("/"); await search("SC06");
  await act(async () => button("ไปทางเข้าอาคาร").click());
  await act(async () => box.querySelector('a[href="/?q=SC06"]').click());
  expect(window.location.pathname).toBe("/");
  expect(box.querySelector("input").value).toBe("SC06");
  expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});

test("unmatched query can be cleared to show all rooms", async () => {
  api.get.mockResolvedValueOnce({ data: [] });
  await open("/?q=missing");
  expect(box.textContent).toContain("ไม่พบห้อง");
  await act(async () => button("ดูห้องทั้งหมด").click());
  expect(box.querySelector("input").value).toBe("");
  expect(window.location.search).toBe("");
  expect(button("ไปทางเข้าอาคาร")).toBeDefined();
});

test("search text stays in sync when browser history changes", async () => {
  await open("/?q=SC06");
  await act(async () => {
    window.history.replaceState({}, "", "/?q=RC01");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(box.querySelector("input").value).toBe("RC01");
  expect(api.get).toHaveBeenLastCalledWith("/rooms/", expect.objectContaining({ params: { search: "RC01" } }));
});

const indoorRoom = { ...room, name: "DEMO-301", floor_id: 33, building_id: 2, is_demo: true, navigation_scope: "room", navigation_label: "DEMO-301" };
const indoorFloors = [1, 2, 3].map((number) => ({ id: 30 + number, name: `ชั้น ${number}`, number }));
const indoorRoute = {
  map_type: "indoor", is_demo: true, total_distance: 36.5,
  path: [{ id: 20, floor_id: 31 }, { id: 21, floor_id: 32 }, { id: 3, floor_id: 33 }],
  segments: [31, 32, 33].map((floor_id) => ({ floor_id, node_ids: [] })),
  directions: [{ kind: "stairs", text: "ขึ้นบันไดจากชั้น 1 ไปชั้น 2", floor_id: 31, target_floor_id: 32 }],
};
function useIndoorApi() {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/navigate/nodes"
    ? [...nodes, { id: 20, label: "ทางเข้าอาคารทดลอง", floor: 1, floor_id: 31, building_id: 2 },
        { id: 99, label: "อาคารอื่น", floor: 1, floor_id: 91, building_id: 9 }]
    : url === "/floors/" ? indoorFloors : indoorRoom }));
  api.post.mockResolvedValue({ data: indoorRoute });
}

test("indoor route filters starts, shows demo notice and switches floors from directions", async () => {
  useIndoorApi();
  await open("/navigate?room=10");
  expect(box.textContent).toContain("โหมดทดลอง");
  const start = box.querySelector("#start-location");
  expect(start.options).toHaveLength(2);
  expect(start.textContent).not.toContain("ทางเข้า SC06");
  expect(start.textContent).not.toContain("อาคารอื่น");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("33");
  await choose("20"); await submit();
  expect(box.textContent).toContain("ระยะทางจำลอง: 36.5 เมตร");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("31");
  await act(async () => button("ดูชั้นที่ไปถึง").click());
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("32");
  expect(box.querySelector('[aria-pressed="true"]').textContent).toContain("ชั้น 2");
});

test("changing mode clears a route and sends the selected restriction", async () => {
  useIndoorApi(); await open("/navigate?room=10"); await choose("20"); await submit();
  await act(async () => Simulate.change(box.querySelector("#route-mode"), { target: { value: "elevator" } }));
  expect(box.textContent).not.toContain("36.5 เมตร");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.route).toBe("false");
  await submit();
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", { start_node_id: 20, end_node_id: 3, route_mode: "elevator" }, expect.anything());
});

test("mode change cancels a pending route and ignores its late floor list", async () => {
  useIndoorApi();
  let resolve; api.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await open("/navigate?room=10"); await choose("20"); await submit();
  const signal = api.post.mock.calls[0][2].signal;
  await act(async () => Simulate.change(box.querySelector("#route-mode"), { target: { value: "elevator" } }));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: indoorRoute }));
  expect(box.querySelector('[data-testid="floor-map"]').dataset.route).toBe("false");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("33");
});

test("floor loading failure offers a retry", async () => {
  useIndoorApi();
  const implementation = api.get.getMockImplementation();
  api.get.mockImplementation((url, options) => url === "/floors/" ? Promise.reject(new Error("offline")) : implementation(url, options));
  await open("/navigate?room=10");
  expect(box.querySelector('[role="alert"]').textContent).toContain("โหลดข้อมูลสำหรับนำทางไม่ได้");
  useIndoorApi(); await act(async () => button("ลองอีกครั้ง").click());
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("33");
});

const demoBuilding = { id: 2, code: "DEMO", name: "อาคารทดลอง 3 ชั้น", is_demo: true };
const planRooms = [1, 2, 3].map((number) => ({
  ...indoorRoom, id: 100 + number, name: `DEMO-${number}01`, floor: number, floor_id: 30 + number,
  node_id: 200 + number, navigation_node_id: 200 + number, navigation_label: `DEMO-${number}01`, building_name: demoBuilding.name, map_position: { x: 350, y: 240 },
}));
function usePlanApi() {
  api.get.mockImplementation((url, options) => {
    if (url === "/buildings/") return Promise.resolve({ data: [demoBuilding] });
    if (url === "/floors/") return Promise.resolve({ data: indoorFloors });
    if (url === "/rooms/") return Promise.resolve({ data: options?.params?.building_id ? planRooms : [room] });
    if (url === "/rooms/10") return Promise.resolve({ data: room });
    if (url.startsWith("/rooms/")) return Promise.resolve({ data: planRooms.find((item) => String(item.id) === url.split("/").pop()) });
    if (url === "/navigate/nodes") return Promise.resolve({ data: [...nodes, { id: 20, label: "ทางเข้าอาคารทดลอง", floor: 1, floor_id: 31, building_id: 2 }] });
    return Promise.reject(new Error("Unknown URL"));
  });
}

test("outdoor page opens the demo inline and closing preserves the active route", async () => {
  usePlanApi();
  await open("/navigate?room=10&q=SC06"); await choose("1"); await submit();
  const originalUrl = window.location.href;
  await act(async () => button("ดูผังอาคารทดลอง").click());
  const dialog = box.querySelector("dialog");
  expect(dialog.hasAttribute("open")).toBe(true);
  expect(dialog.textContent).toContain("แยกจากปลายทาง SC06-301");
  expect(dialog.textContent).toContain("DEMO-101");
  expect(dialog.textContent).not.toContain("DEMO-301");
  expect(api.get).toHaveBeenCalledWith("/rooms/", expect.objectContaining({ params: { building_id: 2 } }));
  await act(async () => button("กลับไปแผนที่").click());
  expect(box.querySelector("dialog")).toBeNull();
  expect(window.location.href).toBe(originalUrl);
  expect(box.querySelector("#start-location").value).toBe("1");
  expect(box.textContent).toContain("85.0 เมตร");
  expect(api.post).toHaveBeenCalledTimes(1);
});

test("floor browser selects a room into navigation while retaining the search", async () => {
  usePlanApi(); await open("/navigate?room=10&q=SC06");
  await act(async () => button("ดูผังอาคารทดลอง").click());
  await act(async () => [...box.querySelectorAll("dialog .floor-selector button")].find((b) => b.textContent === "ชั้น 3").click());
  expect(box.querySelector("dialog").textContent).toContain("DEMO-301");
  expect(box.querySelector("dialog").textContent).not.toContain("DEMO-101");
  await act(async () => button("ไปห้องนี้").click());
  expect(box.querySelector("dialog")).toBeNull();
  expect(new URLSearchParams(window.location.search).get("room")).toBe("103");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("SC06");
  expect(box.textContent).toContain("ปลายทาง: DEMO-301");
  expect(box.querySelector("#start-location").value).toBe("");
});

test("indoor destination opens its own floor immediately", async () => {
  usePlanApi(); await open("/navigate?room=103");
  await act(async () => button("ดูผังชั้น 3 · ห้อง DEMO-301").click());
  expect(box.querySelector('dialog [data-testid="floor-map"]').dataset.floor).toBe("33");
  expect(box.querySelector("dialog").textContent).toContain("ห้องที่เลือกอยู่: DEMO-301");
  expect(api.get.mock.calls.some(([url]) => url === "/buildings/")).toBe(false);
});

test("home provides the floor browser without requiring a DEMO search", async () => {
  usePlanApi(); await open("/?q=SC06");
  await act(async () => button("ดูผังอาคารทดลอง").click());
  expect(box.querySelector("dialog").textContent).toContain("DEMO-101");
  await act(async () => button("กลับไปค้นหาห้อง").click());
  expect(box.querySelector("input").value).toBe("SC06");
  expect(box.querySelector("dialog")).toBeNull();
});

test("floor browser can retry loading errors without leaving the map", async () => {
  usePlanApi(); await open("/navigate?room=10");
  api.get.mockRejectedValueOnce(new Error("offline"));
  await act(async () => button("ดูผังอาคารทดลอง").click());
  expect(box.querySelector('dialog [role="alert"]').textContent).toContain("โหลดผังอาคารไม่ได้");
  await act(async () => button("ลองอีกครั้ง").click());
  expect(box.querySelector('dialog [data-testid="floor-map"]')).not.toBeNull();
});

test("missing demo building explains unavailable plans", async () => {
  usePlanApi(); await open("/navigate?room=10");
  api.get.mockResolvedValueOnce({ data: [] });
  await act(async () => button("ดูผังอาคารทดลอง").click());
  expect(box.querySelector('dialog [role="alert"]').textContent).toContain("ยังไม่มีอาคารทดลองให้ดู");
  expect(box.querySelector('dialog [data-testid="floor-map"]')).toBeNull();
});

test("closing while loading aborts requests and ignores late results", async () => {
  usePlanApi(); await open("/navigate?room=10");
  let resolve; api.get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await act(async () => button("ดูผังอาคารทดลอง").click());
  const signal = api.get.mock.calls.at(-1)[1].signal;
  await act(async () => button("กลับไปแผนที่").click());
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: [demoBuilding] }));
  expect(box.querySelector("dialog")).toBeNull();
  expect(box.textContent).toContain("ปลายทาง: SC06-301");
});

async function reloadApp() {
  await act(async () => root.unmount());
  root = createRoot(box);
  await act(async () => root.render(<App />));
}

test("entrance coverage is explicit in search, summary and the zero-distance result", async () => {
  await open("/");
  expect(button("ไปทางเข้าอาคาร")).toBeDefined();
  expect(button("ไปห้องนี้")).toBeUndefined();
  expect(box.textContent).toContain("นำทางได้ถึงทางเข้าอาคารเท่านั้น");
  await act(async () => button("ไปทางเข้าอาคาร").click());
  expect(box.textContent).toContain("ยังไม่มีเส้นทางภายในอาคารไปถึงประตูห้อง SC06-301 ชั้น 3");
  await choose("1"); await submit();
  expect(box.querySelector(".route-summary").textContent).toContain("จุดหมาย: ทางเข้า SC06");
  expect(box.querySelector(".route-summary").textContent).not.toContain("จุดหมาย: SC06-301");
});

test("raw node ID without verified coverage cannot start navigation", async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/navigate/nodes"
    ? nodes : { ...room, navigation_node_id: null, navigation_scope: "unavailable" } }));
  await open("/navigate?room=10&start=1&route=1");
  expect(box.textContent).toContain("ยังไม่มีข้อมูลเส้นทาง");
  expect(box.querySelector("form")).toBeNull();
  expect(api.post).not.toHaveBeenCalled();
});

test("reload preserves start, mode, viewed floor and search while recomputing the route", async () => {
  useIndoorApi(); await open("/navigate?room=10&q=DEMO"); await choose("20");
  await act(async () => Simulate.change(box.querySelector("#route-mode"), { target: { value: "stairs" } }));
  await submit();
  await act(async () => button("ดูชั้นที่ไปถึง").click());
  expect(api.post).toHaveBeenCalledTimes(1); // viewing a floor does not recalculate
  await reloadApp();
  expect(box.querySelector("#start-location").value).toBe("20");
  expect(box.querySelector("#route-mode").value).toBe("stairs");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.floor).toBe("32");
  expect(box.textContent).toContain("36.5 เมตร");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("DEMO");
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", { start_node_id: 20, end_node_id: 3, route_mode: "stairs" }, expect.anything());
});

test("reload before requesting a route restores choices without calculating", async () => {
  await open("/navigate?room=10"); await choose("2");
  await reloadApp();
  expect(box.querySelector("#start-location").value).toBe("2");
  expect(api.post).not.toHaveBeenCalled();
});

test.each(["999", "-1", "1.0", "9007199254740993"])("saved invalid or deleted start %s requires a new selection", async (start) => {
  await open(`/navigate?room=10&start=${start}&route=1`);
  expect(box.textContent).toContain("จุดเริ่มต้นเดิมใช้ไม่ได้แล้ว");
  expect(box.querySelector("#start-location").value).toBe("");
  expect(api.post).not.toHaveBeenCalled();
  await choose("1"); await submit();
  expect(box.textContent).toContain("85.0 เมตร");
});

test("invalid saved mode requires confirmation instead of silently changing the route", async () => {
  useIndoorApi(); await open("/navigate?room=10&start=20&mode=unknown&route=1");
  expect(box.textContent).toContain("ตัวเลือกเส้นทางเดิมไม่ถูกต้อง");
  expect(api.post).not.toHaveBeenCalled();
  await submit();
  expect(api.post).toHaveBeenLastCalledWith("/navigate/", expect.objectContaining({ route_mode: "shortest" }), expect.anything());
});

test("reload reports a newly unavailable route without resurrecting the previous line", async () => {
  useIndoorApi(); await open("/navigate?room=10"); await choose("20"); await submit();
  api.post.mockRejectedValue({ response: { data: { detail: { code: "ROUTE_NOT_FOUND" } } } });
  await reloadApp();
  expect(box.textContent).toContain("ไม่พบเส้นทางจากจุดนี้");
  expect(box.textContent).not.toContain("36.5 เมตร");
  expect(box.querySelector('[data-testid="floor-map"]').dataset.route).toBe("false");
});
