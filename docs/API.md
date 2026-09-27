# API Documentation

Base URL: `http://localhost:8000/api`

## Buildings
- `GET /buildings` - list all buildings
- `GET /buildings/{id}` - get a single building

## Rooms
- `GET /rooms?search=` - list/search rooms
- `GET /rooms/{id}` - get a single room

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
- Search with `GET /rooms/?search=SC06`, then open `/navigate?room=<room.id>`.
- Restore the chosen destination with `GET /rooms/{id}`. A missing room returns `404`.
- Use the room's `node_id` as `end_node_id`, not its room ID. If `node_id` is null, navigation is unavailable.
- `GET /navigate/nodes` returns named starting locations as `[{"id": 1, "label": "ทางเข้า SC06", "floor": 1}]`.
  Unnamed nodes are hidden from this picker but remain available to the routing algorithm.
- Submit a positive integer `start_node_id` and the destination's `node_id` to `POST /navigate/`.
- Changing the start or destination clears the previous route; loading and routing failures are shown in Thai.

This step connects room search and start selection to the navigation API. Drawing the route on the map and moving search to the home page are separate follow-up steps.

## Route map display
After a successful navigation request, the frontend renders the ordered path
inside the Leaflet map, with labeled start and destination markers. The view
fits the full route automatically; the "ดูเส้นทางทั้งหมด" button restores this
view after panning or zooming. A single-node route uses one combined marker.
Changing the start/destination or a failed request clears the previous overlays.
This view uses geographic coordinates from the API; indoor floor plans and
floor-by-floor directions remain future work.
