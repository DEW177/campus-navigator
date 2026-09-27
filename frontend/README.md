# Campus Navigator - Frontend

React frontend for the Web-Based Classroom Navigation System.

## Setup

```bash
npm install
npm start
```

Runs at `http://localhost:3000`. Start the backend on port 8000. The default API
base is `/api`; the dev server proxies to `http://127.0.0.1:8000`. Remove any old
localhost override from `.env.local`, or set `REACT_APP_API_URL=/api`.

Docker serves the build with Nginx and proxies API requests and backend images
through the same origin. To use a phone on the same Wi-Fi, open
`http://<computer IPv4>:3000`. See [setup](../docs/SETUP.md) for upgrades and LAN access.

## Structure
- `src/components/` - CampusMap (Leaflet), ChatBox, SearchBar, RoomCard, RoutePolyline
- `src/pages/` - HomePage, SearchPage, SchedulePage, NavigationPage
- `src/services/api.js` - calls to the backend API
- `src/hooks/` - useRooms, useNavigation
