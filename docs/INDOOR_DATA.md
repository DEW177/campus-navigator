# Indoor navigation data

The included building is entirely simulated. Its plans, room numbers, landmark
illustrations and distances do not describe Khon Kaen University or any real
building. It supports developing and demonstrating the complete navigation flow
while real data is being collected.

## Included dataset

`backend/data/indoor_demo.json` defines one marked `DEMO` building, three floors,
nine room doors and the walkable graph. Plans are in
`backend/app/static/floorplans/`; landmark illustrations are in
`backend/app/static/landmarks/`. The JSON's stable keys join records during import;
database IDs are allocated normally and are never hard-coded in the frontend.

Each plan is 1000 by 600 image units, with a simulated scale of 0.05 metres per
unit. `(0,0)` is the top left; x increases to the right and y increases downward.
Same-floor weights are computed from the segment length times this scale.
Stair connections are 7 simulated metres per floor; lift connections are 3.
These values demonstrate distance-based routing and do not model lift wait time.

Run from `backend/`:

```bash
python -m app.migrations.upgrade
python -m app.database.load_demo
```

The importer validates bounds, scale, node references and floor transitions, then
inserts all demo data in a transaction. Re-running it does not duplicate records.
It deliberately leaves an existing `DEMO` building unchanged, so editing the JSON
does not replace an already loaded dataset. Future dataset changes should use a
new explicit migration/import step. A non-demo building with code `DEMO` causes
an error instead of being overwritten. This command is a demo loader, not a
general importer for real campus data.

## Data to collect for a real building

| Data | What is needed |
| --- | --- |
| Building and floors | Building code/name, floor numbers and names |
| Floor plan | An image for each floor, dimensions and a measured scale |
| Rooms | Room labels, floor and the actual door position on the image |
| Walkable paths | Corridor intersections, turns and doors, with explicit connections that follow the path |
| Stairs and lifts | Corresponding landing positions on each floor, measured connection distances, available floors |
| Landmarks | Recognizable names, descriptions and photographs tied to graph nodes |
| Restrictions | Closed paths and one-way connections; update their state when it changes |

Add a graph point at each change in corridor direction; the map draws straight
segments between points. Do not connect doors through walls. Floor coordinates
from different images cannot be compared as a single map. A stair/lift connection
must explicitly link its landing nodes. Room floor, room building and door node
must agree. Label starts and transition nodes so people can recognize them.

Use `kind="door"` for a room's actual door node; its floor ID, floor number,
building and in-bounds coordinates must match the room before the API exposes
`navigation_scope="room"`. A room bound to an outdoor `kind="entrance"` node
instead gets `navigation_scope="entrance"`, and the UI offers navigation only
to that entrance. Other legacy mappings remain unavailable until verified.

Real records use a distinct building code with `is_demo=false`. Store plans and
photos at a URL the browser can access, and use the same floor/node/connection
schema. Survey and test routes on site before enabling the building for users.
The current frontend already reads these fields; a reviewed real-data import
will still be needed when the survey is ready.

## Current limits

- Outdoor starts use a user-requested device location. Indoor paths begin at the designated
  entrance, not the GPS fix. There is no indoor tracking, automatic floor detection,
  compass guidance or QR start-point flow.
- Directions describe named corridor destinations and floor changes. They do not
  infer left/right from the user's facing direction.
- Stairs/lift choices constrain graph edges. They do not certify an accessible route.
- Continuous graph routing between indoors/outdoors or multiple buildings is not implemented;
  outdoor Google Maps directions and the indoor entrance plan are two explicit stages.
- Map images alone cannot supply walkable paths: the graph must also be surveyed.

## Verification

Run `python -m pytest -q backend/tests` from the repository root and
`CI=true npm test -- --watchAll=false --runInBand` from `frontend/`.
Tests cover floor transitions, route restrictions, inactive/one-way links, malformed
data, repeatable migrations/imports, floor selection and cancellation of old requests.

## Designated entrance

`building_entrances` binds one building to an explicit `kind="entrance"` node. For a real
indoor building this node has a matching floor ID, floor number and in-bounds image coordinates.
The row's optional latitude/longitude identify this same entrance on the road map. Survey them;
do not automatically copy the building centre. Null geographic coordinates keep indoor trials
available without publishing a fake road destination. The DEMO loader creates this row using
`entrance_node` in its JSON. The migration adds it to older unchanged sample databases and
preserves existing entrance bindings. See [CURRENT_LOCATION.md](CURRENT_LOCATION.md).
