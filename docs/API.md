# API Documentation

Browser base URL: `/api` on the frontend origin (proxied to the backend).
Direct API access during development: `http://localhost:8000/api`.

## Outdoor search and routing (optional Geoapify key)

- `GET /outdoor/status` → `{ "configured": true }` (key presence, not a provider health check).
- `POST /outdoor/search` → body `{ "query": "หอพัก ขอนแก่น", "building_id": 1 }`;
  response `results: [{ label, latitude, longitude, attribution }]`. Empty results are valid.
  Search is submitted explicitly, limited to Thailand, and biased toward the building entrance.
- `POST /outdoor/route` → body `{ "origin": { "latitude": 16.45, "longitude": 102.8 }, "building_id": 1, "mode": "walk" }`;
  mode is `walk` or `drive`. Destination comes from the validated entrance in the database.
  Response: `geometry` (GeoJSON MultiLineString, **longitude then latitude**), `distance_m`,
  `duration_s`, `mode`, `entrance`, `is_demo`, `start_gap_m`, `end_gap_m`.
  Gaps indicate how far provider geometry endpoints lie from the requested positions.
- Errors use `detail: { code, message }`: 503 `NOT_CONFIGURED`/`PROVIDER_AUTH`,
  429 `DAILY_LIMIT`/`RATE_LIMIT`/`PROVIDER_LIMIT`, 504 `PROVIDER_TIMEOUT`,
  404 `BUILDING_NOT_FOUND`/`ROUTE_NOT_FOUND`, 422 `ENTRANCE_UNMAPPED` or validation errors,
  502 `INVALID_RESPONSE`/`PROVIDER_UNAVAILABLE`. No provider body, URL, or key is returned.

Requests containing user search/location data use POST to avoid query-string access logs.
Successful responses have `Cache-Control: no-store`. See [setup and limits](OUTDOOR_NAVIGATION.md).

## Buildings
- `GET /buildings/` - list all buildings
- `GET /buildings/{id}` - get a single building

## Rooms
- `GET /rooms/?search=` - list/search rooms
- `GET /rooms/{id}` - get a single room
- `GET /rooms/?building_id=<id>` - list rooms in one building; can be combined with `search`.
  A building ID must be positive. Results are ordered by floor, room name and ID.
- Room responses include `map_position: {"x": number, "y": number}` for a mapped indoor door,
  or `null` when no matching floor coordinates are available. These are image coordinates,
  not latitude/longitude. The floor browser uses them as selectable room markers.
- `navigation_scope` describes the verified destination: `room` for a door whose
  building, floor and coordinates match the room; `entrance` for an explicitly
  marked outdoor entrance; `unavailable` for missing/unverified mappings.
- `navigation_node_id` is the usable destination ID, or `null` when unavailable.
  `navigation_label` names that destination (room or entrance). The older `node_id`
  remains in the response for compatibility and does not imply door coverage.

## Navigation
- `POST /navigate/`
  ```json
  { "start_node_id": 1, "end_node_id": 3 }
  ```
  Returns the shortest path (Dijkstra's Algorithm) as a list of nodes plus total distance in meters.

  Node IDs must be positive JSON integers (not strings or booleans).
  A successful response has this shape:
  ```json
  {
    "path": [{ "id": 1, "latitude": 16.4735, "longitude": 102.8236, "floor": 1 }],
    "total_distance": 0.0
  }
  ```
  When both IDs identify the same existing node, the path contains that node
  and the distance is zero, even if that node has no connections.
  This is a graph result, not a detected arrival. In particular, an entrance node
  attached to an upstairs room still identifies the entrance, not the room door.

  Errors:
  - `404`, `detail.code = "NODE_NOT_FOUND"`: an endpoint does not exist;
    `detail.node_ids` lists the missing IDs.
  - `404`, `detail.code = "ROUTE_NOT_FOUND"`: both endpoints exist but are disconnected.
  - `422`: a required ID is missing or is not a positive integer.

  The two `404` errors include a Thai `detail.message` for display.
  Example:
  ```json
  { "detail": { "code": "ROUTE_NOT_FOUND", "message": "ไม่พบเส้นทางเชื่อมระหว่างจุดเริ่มต้นกับจุดหมาย" } }
  ```
  Clients should check the HTTP status and `detail.code` before using `path`.
  Unreachable routes do not return an infinite distance.

## Courses
- `GET /courses/` - list all courses with their room locations

## Chat
- `POST /chat/ask`
  ```json
  { "message": "How do I get to SC06-301?" }
  ```

## Search to navigation flow
- Start at `/`, search with `GET /rooms/?search=SC06`, then open `/navigate?room=<id>&q=<query>`.
- Room responses include `entrance`, either null or `{node_id, label, floor_id, floor, latitude, longitude}`.
  It is the building's designated entry, validated against the indoor building/floor/coordinates.
  Null latitude/longitude means there is no geographic road-map destination. The synthetic DEMO
  never exposes geographic coordinates; its graph entry is still available for indoor trials.
- The browser reads the device location only after a button press. It opens an explicit Google Maps
  link with the current origin and the entrance's geographic destination; no street geometry is
  calculated by our node-routing API. Invalid/denied/timed-out fixes offer a retry and preserve browsing.
- The indoor action uses `entrance.node_id` as `start_node_id` and `navigation_node_id` as `end_node_id`.
  These are different from room IDs. No nearest-node guessing or manual start picker is used.
- `GET /navigate/nodes` remains available for graph inspection and future features; the main page no
  longer requests this list. The generic `POST /navigate/` node contract remains compatible.

Navigation URLs retain `room`, `q`, `mode`, `floor` and `route=1` for an explicitly requested
indoor route. Refresh reloads room/entrance data and recalculates it. No geometry or device
coordinates are saved. The old `start` query parameter is not used; a link containing it will
not automatically recalculate from a different point. A new indoor action removes it.
Changing mode clears the route; changing the viewed floor does not recalculate.

The home page preserves search in `/?q=...`. Legacy `/search` links redirect home with the same query.

## Outdoor map display
The app shows the designated entrance and the latest device fix with an accuracy circle. These
are positions, not a route; road routing opens in Google Maps and allows the user to choose a
travel mode there. No straight line is invented between home and campus, and GPS does not
imply an indoor floor or automatic arrival. See [CURRENT_LOCATION.md](CURRENT_LOCATION.md).

## Indoor navigation

- `GET /floors/?building_id=<id>` returns floors ordered by number. Each floor
  has `id`, `building_id`, `number`, `name`, `image_url`, `width`, `height`, and
  `meters_per_unit` (the dimensions use image coordinates).
- `GET /floors/{id}` returns one floor or `404`.
- Room responses also include `floor_id`, `building_name`, and `is_demo`.
- Named start locations also include `floor_id`, `building_id`, `building_name`,
  and `is_demo`. The main UI uses the designated entrance, not this list.
- `POST /navigate/` accepts an optional `route_mode`: `shortest` (default),
  `stairs` (exclude lift edges), or `elevator` (exclude stair edges). A restricted
  route with no available connection returns `404 ROUTE_NOT_FOUND`; it does not
  silently switch modes. The mode is a transition preference, not an accessibility
  certification. Inactive connections are excluded in all modes.

Indoor responses retain `path` and `total_distance` and add:

| Field | Meaning |
| --- | --- |
| `map_type` | `indoor`; legacy routes return `outdoor` |
| `is_demo` | Indoor building is simulated, or an outdoor path includes a node attached to a marked sample building |
| `path[].floor_id`, `x`, `y` | Floor identity and top-left-origin image coordinates |
| `path[].kind`, `label` | Walk point, door, stairs or elevator, and a recognizable name |
| `floors` | Floor metadata for the visited floors |
| `segments` | Ordered `{floor_id, node_ids}` sections; separate visits stay separate |
| `directions` | Ordered text steps with `kind`, `floor_id`, optional `target_floor_id`, `landmark_description`, `image_url` |

The frontend converts image `(x,y)` to Leaflet Simple CRS `[height-y,x]`. It draws
only segments for the selected floor, never a line between floors. Clicking a
transition step selects its target floor. Floor images and landmark illustrations
are served at the API server's `/static/` path (outside the `/api` prefix).

Malformed map geometry, unsupported indoor/outdoor mixing, invalid floor
transitions or invalid edge weights return `409` with
`detail.code = "INVALID_MAP_DATA"`. Invalid route modes return `422`.
Distances in the demo include simulated vertical travel; they are not travel-time
estimates. No automatic indoor location tracking is provided.

## Browse floor plans from the current page

The home page and outdoor navigation page include a **ดูผังอาคารทดลอง** button.
It opens a modal on the same page: choose a floor, then select a room from its
marker popup or the room list. **ไปห้องนี้** opens that room's navigation URL and
retains the existing search query. Indoor destinations instead show a button with
their floor and room name, opening the destination floor immediately and highlighting
its door. Building/floor/room IDs are read from the API rather than hard-coded.

Closing the dialog or pressing Escape preserves the current destination, start,
route and search. The dialog supports keyboard focus and returns focus to its
trigger. Loading failures have a retry action; closing cancels pending requests.
The demo is clearly separate from a selected outdoor destination such as SC06-301.
This browser does not join outdoor and indoor route graphs or detect arrival.
