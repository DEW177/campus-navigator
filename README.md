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
docker-compose up --build
```

Indoor navigation can be tried immediately with the explicitly marked **DEMO**
building: search `DEMO-301`, start at `ทางเข้าอาคารทดลอง`, and choose stairs or lift.
It includes 3 simulated floor plans, 9 rooms and step-by-step directions.
Real campus plans and surveyed paths are still needed before using it on site.
See [the indoor data guide](docs/INDOOR_DATA.md).

## Tech stack
- Backend: Python, FastAPI, SQLAlchemy, PostgreSQL
- Frontend: React, Leaflet
- Algorithm: Dijkstra's Algorithm (shortest path)
