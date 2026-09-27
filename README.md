# Campus Navigator

Web-Based Classroom Navigation System for the College of Computing,
Department of Computer Science, Khon Kaen University.

A web app that helps students and visitors find the shortest walking route
to a classroom on campus, using Dijkstra's Algorithm on a weighted graph of
the campus's walkways.

## Project layout
- `backend/` - FastAPI + PostgreSQL API (Partner 1)
- `frontend/` - React + Leaflet map UI (Partner 2)
- `database/` - shared schema and seed data
- `docs/` - API, database, setup, and architecture docs

## Quick start
See `docs/SETUP.md`, or run everything with:
```bash
docker compose up --build
```

Indoor navigation can be tried immediately with the explicitly marked **DEMO**
building: search `DEMO-301`, choose stairs or lift, and press `ทดลองเส้นทางจากทางเข้า`.
The indoor start is the designated entrance; users do not choose a graph point.
It includes 3 simulated floor plans, 9 rooms and step-by-step directions.
Real campus plans and surveyed paths are still needed before using it on site.
See [the indoor data guide](docs/INDOOR_DATA.md).

The original SC06/RC01 sample routes reach building entrances only; the app labels
this limitation explicitly. Indoor navigation choices survive refresh, and requested
routes are recalculated using current data. For phone access on the same Wi-Fi,
open `http://<computer IPv4>:3000`; see [setup](docs/SETUP.md).

## Tech stack
- Backend: Python, FastAPI, SQLAlchemy, PostgreSQL
- Frontend: React, Leaflet
- Algorithm: Dijkstra's Algorithm (shortest path)

The main outdoor action uses the phone's current location, then opens road directions
in Google Maps. There is no start-address or floor form. Phone geolocation requires
HTTPS; localhost also works for desktop development. See [current location and local
HTTPS setup](docs/CURRENT_LOCATION.md).
