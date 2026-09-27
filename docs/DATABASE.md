# Database Schema

`database/schema.sql` is the legacy outdoor bootstrap. The current schema is that
bootstrap plus the ordered migrations in `backend/app/migrations/versions/`. Run
`python -m app.migrations.upgrade` from `backend/` for either an existing database
or a fresh database. The migration adds tables/columns and preserves existing data.

| Table       | Purpose                                              |
|-------------|-------------------------------------------------------|
| buildings   | Buildings on campus (name, code, coordinates)         |
| building_entrances | One designated entrance node and optional surveyed geographic coordinates per building |
| floors      | Building floor, plan URL, image dimensions and metric scale |
| nodes       | Points in the walkable graph (intersections, doors)   |
| connections | Weighted edges between nodes, used by Dijkstra/A*     |
| rooms       | Rooms, linked to a building and an entry node         |
| courses     | Course sections, linked to a room                     |

Nodes/Connections are kept separate from Rooms/Buildings so that pathfinding
queries stay fast and independent of room/building metadata (per the
literature review's Synthesis Matrix recommendation).

Indoor nodes add a nullable `floor_id`, image coordinates `x/y`, `kind`, and optional
landmark description/image. `rooms.floor_id` identifies the destination floor;
`rooms.node_id` is its door. Legacy `floor` numbers remain for compatibility.
Connections add `kind` (`walk`, `stairs`, `elevator`), `is_active`, and
`bidirectional`. Weight is distance in metres in the current API.

Each floor belongs to a building and has a unique number within that building.
An indoor route must stay in one building. Cross-floor connections explicitly
join matching staircase or lift nodes; no automatic links are inferred from
equal image coordinates. Legacy outdoor nodes have null `floor_id` and retain
latitude/longitude routing.

`buildings.is_demo` marks simulated data. The repeatable demo loader inserts the
`DEMO` building in one transaction when absent. If it already exists, the loader
leaves all its rows unchanged. It never rewrites other buildings or node IDs.
See [INDOOR_DATA.md](INDOOR_DATA.md) for preparing real data.

`v003_building_entrances` adds explicit handoff points for the original sample
buildings and upgrades the known entry in older indoor demos. Existing bindings
are preserved. `building_entrances.building_id` is both the primary key and a
foreign key, so each building has one designated entrance in this version.
`node_id` identifies that entrance in the graph; nullable `latitude/longitude`
locate the same entrance on the road map. No coordinates are inferred from the
building centre. The synthetic DEMO has no geographic destination.
