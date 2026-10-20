# Campus Navigator - Frontend

React frontend for the Web-Based Classroom Navigation System.

## Setup

```bash
npm ci
npm start
```

Runs at `http://localhost:3000`. Start the backend on port 8000. The default API
base is `/api`; the dev server proxies to `http://127.0.0.1:8000`. Remove any old
localhost override from `.env.local`, or set `REACT_APP_API_URL=/api`.

Docker serves the build with Nginx and proxies API requests and backend images
through the same origin. To use a phone on the same Wi-Fi, open
`http://<computer IPv4>:3000`. See [setup](../docs/SETUP.md) for upgrades and LAN access.

## Structure
- `src/components/` - CampusMap (Leaflet), OutdoorNavigation, BuildingPlanBrowser, RoomCard, FloorMap
- `src/pages/` - HomePage, SearchPage (legacy redirect), NavigationPage; SchedulePage is paused
- `src/services/api.js` - calls to the backend API
- `src/hooks/` - useNavigation, useOutdoorRequest, useCurrentLocation

The home page loads buildings/rooms once and filters by submitted room code or
building name, grouping results by building and floor. DEMO has a separate trial section.
The navigation page requests geolocation on a button press, draws Geoapify driving
routes when configured, offers a Google Maps driving link, and starts indoor plans
from the building's designated entrance. Phone geolocation
requires trusted HTTPS, while desktop localhost also works. See
[current location setup](../docs/CURRENT_LOCATION.md) for the optional Docker HTTPS gateway.

Chat and course schedules are paused; `/schedule` redirects home. Their source
files remain for later development. Outdoor walking mode has been removed; indoor
walking routes and stairs/lift choices remain. Docker uses `npm ci` and the committed
`package-lock.json`; update the lockfile intentionally when changing dependencies.

`typescript` is pinned to 4.9.5 as a development dependency to satisfy
`react-scripts@5`'s optional TypeScript 3/4 peer range during clean installs.
The application source remains JavaScript.
