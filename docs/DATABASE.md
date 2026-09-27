# Database Schema

See `database/schema.sql` for the full DDL.

| Table       | Purpose                                              |
|-------------|-------------------------------------------------------|
| buildings   | Buildings on campus (name, code, coordinates)         |
| nodes       | Points in the walkable graph (intersections, doors)   |
| connections | Weighted edges between nodes, used by Dijkstra/A*     |
| rooms       | Rooms, linked to a building and an entry node         |
| courses     | Course sections, linked to a room                     |

Nodes/Connections are kept separate from Rooms/Buildings so that pathfinding
queries stay fast and independent of room/building metadata (per the
literature review's Synthesis Matrix recommendation).
