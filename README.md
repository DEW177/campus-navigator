# Campus Navigator

Web-Based Classroom Navigation System for the College of Computing,
Department of Computer Science, Khon Kaen University.

A web app that helps students and visitors find classrooms: plan a driving route
to the building entrance with Geoapify, then follow an indoor entrance-to-door
route calculated by Dijkstra on a surveyed graph. Indoor data is currently simulated.

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

Outdoor starts can use device location, submitted address search, or a map pin.
With an optional server-side Geoapify key, the app draws driving routes to
the designated entrance with distance and estimated time. Google Maps remains an
optional handoff. Without a key, manual pins and the handoff still work.
See [outdoor setup and quota controls](docs/OUTDOOR_NAVIGATION.md).
This is route planning, not live tracking or turn-by-turn driving navigation.
Phone geolocation requires HTTPS; localhost works for desktop development.
See [current location and local HTTPS setup](docs/CURRENT_LOCATION.md).

## Current scope and verification

The home page groups rooms by building and floor. Submit a room code or building
name with Search/Enter to filter the loaded data; typing does not send API requests.
The synthetic DEMO building is shown separately. Chat and course schedules are
paused: their code/data is retained, but their API routers are not registered and
`/schedule` redirects to the home page. Outdoor walking mode is no longer accepted;
indoor walking routes, stairs and lift choices remain available.

```bash
python -m pytest -q backend/tests
cd frontend
npm ci
npm test -- --watchAll=false --runInBand
npm run build
```

Before on-site use, survey one real building, including its entrance, room doors,
corridors, stairs/lifts, and a verified vehicle drop-off or parking point. The current
driving destination is the designated entrance; parking and the outdoor walk from
a parking point to that entrance are not modeled. Do not publish guessed coordinates.
