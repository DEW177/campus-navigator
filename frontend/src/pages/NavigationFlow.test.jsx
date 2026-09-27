import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import App from "../App";
import api from "../services/api";
jest.mock("../services/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../components/CampusMap", () => () => <div />);
jest.mock("../components/RoutePolyline", () => () => null);
const room = { id: 10, name: "SC06-301", floor: 3, node_id: 3, building_id: 1 };
const nodes = [{ id: 1, label: "ทางเข้า SC06", floor: 1 }, { id: 2, label: "ทางแยก", floor: 1 }];
let box, root;
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
  await act(async () => button("ไปห้องนี้").click());
  expect(new URLSearchParams(window.location.search).get("room")).toBe("10");
  expect(new URLSearchParams(window.location.search).get("q")).toBe("SC06");
  expect(box.textContent).toContain("ปลายทาง: SC06-301");
  expect(button("ค้นหาเส้นทาง").disabled).toBe(true);
  expect(box.textContent).toContain("ทางเข้า SC06");
  await choose("1"); await submit();
  expect(api.post).toHaveBeenCalledWith("/navigate/", { start_node_id: 1, end_node_id: 3 }, expect.objectContaining({ signal: expect.anything() }));
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
  api.get.mockImplementation((url) => Promise.resolve({ data: url === "/navigate/nodes" ? nodes : { ...room, node_id: null } }));
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
  expect(box.textContent).toContain("จุดเริ่มต้นและจุดหมายเป็นจุดเดียวกัน");
});
test("search network error can retry", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")); await open("/search");
  expect(box.querySelector('[role="alert"]').textContent).toContain("โหลดรายการห้องไม่ได้");
  await act(async () => button("ลองอีกครั้ง").click()); expect(button("ไปห้องนี้")).toBeDefined();
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
  expect(button("ไปห้องนี้")).toBeDefined();
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
  await act(async () => button("ไปห้องนี้").click());
  await act(async () => box.querySelector('a[href="/?q=SC06"]').click());
  expect(window.location.pathname).toBe("/");
  expect(box.querySelector("input").value).toBe("SC06");
  expect(button("ไปห้องนี้")).toBeDefined();
});

test("unmatched query can be cleared to show all rooms", async () => {
  api.get.mockResolvedValueOnce({ data: [] });
  await open("/?q=missing");
  expect(box.textContent).toContain("ไม่พบห้อง");
  await act(async () => button("ดูห้องทั้งหมด").click());
  expect(box.querySelector("input").value).toBe("");
  expect(window.location.search).toBe("");
  expect(button("ไปห้องนี้")).toBeDefined();
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
