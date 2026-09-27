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

The frontend uses `/api` on its own origin. The development server proxies these
requests to `http://127.0.0.1:8000`. If you already have `frontend/.env.local` with
`REACT_APP_API_URL=http://localhost:8000/api`, change it to `REACT_APP_API_URL=/api`
or remove that line, then restart `npm start`.

## 4. Or with Docker
```bash
docker compose up --build
```

The backend waits for a healthy database, applies additive indoor schema changes,
and loads the `DEMO` building if it is absent. This also works with the existing
`db_data` volume: **do not delete the volume to upgrade**. Schema migration and
demo loading can be repeated; they preserve existing buildings, rooms and routes.

For an existing installation outside Docker, run the two Python commands above
from `backend/` before restarting the API. A new, empty database can also be
initialized by the migration command. The SQL files in `database/` remain the
legacy outdoor sample bootstrap; always run migrations after using them.

The upgrade recognizes the original SC06/RC01 sample names, coordinates and room
bindings, marks those buildings as demo data, and labels their nodes as entrances.
It skips buildings with changed identifying data, extra rooms or floor plans.
It does not delete records or change room floors, coordinates or route weights.
An unknown legacy node is not assumed to be a classroom door.

## Open from a phone on the same Wi-Fi

1. Run `docker compose up --build` on the computer.
2. On Windows, run `ipconfig` and find the computer's Wi-Fi IPv4 address.
3. On the phone, open `http://<computer IPv4>:3000`, for example
   `http://192.168.1.20:3000`. `localhost` on the phone refers to the phone itself.
4. If the page cannot open, check that both devices are on the same network and
   allow Docker Desktop / TCP port 3000 on the computer's private-network firewall.
   Guest Wi-Fi may block communication between devices.

Nginx proxies `/api/`, `/static/floorplans/`, and `/static/landmarks/` to the backend.
React's `/static/js/` and `/static/css/` remain frontend assets. The browser does
not connect to port 8000, so LAN access needs no additional CORS origin setting.
Docker builds exclude local `.env` files and `node_modules`; an old Windows
`.env.local` cannot bake a localhost API address into the Docker image.

## Try indoor navigation without real campus data

To browse without knowing a demo room code, press **ดูผังอาคารทดลอง** on the home
page or just above the map on the outdoor navigation page. Select a floor and tap
a room marker, then **ไปห้องนี้** (or use the room list below the plan).
**กลับไปแผนที่** closes the plan and preserves the route already on screen.

1. Open `http://localhost:3000/` and search `DEMO-301`.
2. Select the room, then choose `ทางเข้าอาคารทดลอง` on floor 1.
3. Choose stairs and press `ค้นหาเส้นทาง`: the simulated route is 36.5 metres.
4. Use the floor buttons or `ดูชั้นที่ไปถึง` in the directions to view floors 2 and 3.
5. Choose the lift and calculate again: the simulated route is 81.5 metres.

The demo has 3 floors, 9 rooms, a staircase and a lift. Each floor plan and room
card is identified as simulated. SC06/RC01 are also sample data: their routes end
at an outdoor entrance, **not** at the classroom door. Their room cards say
**ไปทางเข้าอาคาร**. A zero-distance result at that entrance does not mean the user
has reached an upstairs classroom.

Map assets are served by the backend and proxied through the frontend. The default
`REACT_APP_API_URL=/api` works on localhost and through the computer's LAN address.
An explicitly configured separate API origin also needs that backend's CORS setup.
Indoor plans do not request external map tiles. Existing outdoor routes still use
Leaflet/OpenStreetMap. There is no live indoor positioning.

Refreshing a navigation page restores the selected start, stairs/lift preference
and viewed floor. If a route was requested before refresh, it is recalculated
from current data. Missing start points require a new selection; route failures
show a recovery message. If you have walked elsewhere, choose your new start:
restoring a choice does not detect your present location.

See [INDOOR_DATA.md](INDOOR_DATA.md) for the data contract and what to survey later.
