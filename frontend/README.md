# Campus Navigator - Frontend

React frontend for the Web-Based Classroom Navigation System.

## Setup

```bash
npm install
npm start
```

Runs at `http://localhost:3000`. Make sure the backend is running at the URL
set in `.env.local` (`REACT_APP_API_URL`).

## Structure
- `src/components/` - CampusMap (Leaflet), ChatBox, SearchBar, RoomCard, RoutePolyline
- `src/pages/` - HomePage, SearchPage, SchedulePage, NavigationPage
- `src/services/api.js` - calls to the backend API
- `src/hooks/` - useRooms, useNavigation
