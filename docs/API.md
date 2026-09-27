# API Documentation

Base URL: `http://localhost:8000/api`

## Buildings
- `GET /buildings` - list all buildings
- `GET /buildings/{id}` - get a single building

## Rooms
- `GET /rooms?search=` - list/search rooms
- `GET /rooms/{id}` - get a single room

## Navigation
- `POST /navigate`
  ```json
  { "start_node_id": 1, "end_node_id": 3 }
  ```
  Returns the shortest path (Dijkstra's Algorithm) as a list of nodes plus total distance in meters.

## Courses
- `GET /courses` - list all courses with their room locations

## Chat
- `POST /chat/ask`
  ```json
  { "message": "How do I get to SC06-301?" }
  ```
