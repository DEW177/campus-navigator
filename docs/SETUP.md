# Setup Instructions

## Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

## 1. Database
```bash
createdb campus_navigator
psql campus_navigator < database/schema.sql
psql campus_navigator < database/seed_data.sql
```

## 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL
python -m app.migrations.upgrade
python -m app.database.load_demo
uvicorn app.main:app --reload
```

## 3. Frontend
```bash
cd frontend
npm install
npm start
```

## 4. Or with Docker
```bash
docker-compose up --build
```

The backend waits for a healthy database, applies additive indoor schema changes,
and loads the `DEMO` building if it is absent. This also works with the existing
`db_data` volume: **do not delete the volume to upgrade**. Schema migration and
demo loading can be repeated; they preserve existing buildings, rooms and routes.

For an existing installation outside Docker, run the two Python commands above
from `backend/` before restarting the API. A new, empty database can also be
initialized by the migration command. The SQL files in `database/` remain the
legacy outdoor sample bootstrap; always run migrations after using them.

## Try indoor navigation without real campus data

1. Open `http://localhost:3000/` and search `DEMO-301`.
2. Select the room, then choose `ทางเข้าอาคารทดลอง` on floor 1.
3. Choose stairs and press `ค้นหาเส้นทาง`: the simulated route is 36.5 metres.
4. Use the floor buttons or `ดูชั้นที่ไปถึง` in the directions to view floors 2 and 3.
5. Choose the lift and calculate again: the simulated route is 81.5 metres.

The demo has 3 floors, 9 rooms, a staircase and a lift. Each floor plan and room
card is identified as simulated. Map assets are served by the backend at
`/static/`; `REACT_APP_API_URL` must point to that backend's `/api` base URL.
Indoor plans do not request external map tiles. Existing outdoor routes still use
Leaflet/OpenStreetMap. There is no live indoor positioning.

See [INDOOR_DATA.md](INDOOR_DATA.md) for the data contract and what to survey later.
