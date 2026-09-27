# System Architecture

```
[React Frontend] <--REST/JSON--> [FastAPI Backend] <---> [PostgreSQL]
      |                                |
   Leaflet map                  Dijkstra / A*
   Chat UI                      pathfinding (app/utils/dijkstra.py)
```

- **Frontend**: React + Leaflet, calls the backend via `src/services/api.js`.
- **Backend**: FastAPI, organized into `models` (SQLAlchemy ORM), `routes`
  (endpoints), `schemas` (Pydantic validation), and `utils` (Dijkstra,
  Haversine).
- **Database**: PostgreSQL, with Nodes/Connections kept separate from
  Buildings/Rooms for faster spatial queries.
