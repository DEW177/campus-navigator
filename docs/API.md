# API Documentation

Base URL: `http://localhost:8000/api`

## Buildings
- `GET /buildings` - list all buildings
- `GET /buildings/{id}` - get a single building

## Rooms
- `GET /rooms?search=` - list/search rooms
- `GET /rooms/{id}` - get a single room
- `GET /rooms/?building_id=<id>` - list rooms in one building; can be combined with `search`.
  A building ID must be positive. Results are ordered by floor, room name and ID.
- Room responses include `map_position: {"x": number, "y": number}` for a mapped indoor door,
  or `null` when no matching floor coordinates are available. These are image coordinates,
  not latitude/longitude. The floor browser uses them as selectable room markers.

## Navigation
- `POST /navigate`
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
- `GET /courses` - list all courses with their room locations

## Chat
- `POST /chat/ask`
  ```json
  { "message": "How do I get to SC06-301?" }
  ```

## Search to navigation flow
- Start at `/`: search is available immediately, or choose a room from the initial list.
- Search with `GET /rooms/?search=SC06`, then open `/navigate?room=<room.id>&q=<search text>`.
- Restore the chosen destination with `GET /rooms/{id}`. A missing room returns `404`.
- Use the room's `node_id` as `end_node_id`, not its room ID. If `node_id` is null, navigation is unavailable.
- `GET /navigate/nodes` returns named starting locations as `[{"id": 1, "label": "ทางเข้า SC06", "floor": 1}]`.
  Unnamed nodes are hidden from this picker but remain available to the routing algorithm.
- Submit a positive integer `start_node_id` and the destination's `node_id` to `POST /navigate/`.
- Changing the start or destination clears the previous route; loading and routing failures are shown in Thai.

The home page stores the search in `/?q=...`. Selecting another room returns to
that search, and refresh/browser history restore the input. Legacy `/search`
links redirect to `/` with the same `q` parameter. Typing replaces the current
history entry rather than creating one entry per character.

## Route map display
After a successful navigation request, the frontend renders the ordered path
inside the Leaflet map, with labeled start and destination markers. The view
fits the full route automatically; the "ดูเส้นทางทั้งหมด" button restores this
view after panning or zooming. A single-node route uses one combined marker.
Changing the start/destination or a failed request clears the previous overlays.
This geographic view remains available for legacy nodes without `floor_id`.
Indoor rooms use the floor-plan view below.

## Indoor navigation

- `GET /floors/?building_id=<id>` returns floors ordered by number. Each floor
  has `id`, `building_id`, `number`, `name`, `image_url`, `width`, `height`, and
  `meters_per_unit` (the dimensions use image coordinates).
- `GET /floors/{id}` returns one floor or `404`.
- Room responses also include `floor_id`, `building_name`, and `is_demo`.
- Named start locations also include `floor_id`, `building_id`, `building_name`,
  and `is_demo`. For indoor navigation the UI offers starts in the room's building;
  outdoor rooms keep the legacy outdoor start list.
- `POST /navigate/` accepts an optional `route_mode`: `shortest` (default),
  `stairs` (exclude lift edges), or `elevator` (exclude stair edges). A restricted
  route with no available connection returns `404 ROUTE_NOT_FOUND`; it does not
  silently switch modes. The mode is a transition preference, not an accessibility
  certification. Inactive connections are excluded in all modes.

Indoor responses retain `path` and `total_distance` and add:

| Field | Meaning |
| --- | --- |
| `map_type` | `indoor`; legacy routes return `outdoor` |
| `is_demo` | Whether this route belongs to the demonstration building |
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
