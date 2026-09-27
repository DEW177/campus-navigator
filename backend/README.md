# Campus Navigator - Backend

FastAPI backend for the Web-Based Classroom Navigation System.

## Setup

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit DATABASE_URL
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs` once running.

## Structure
- `app/models/` - SQLAlchemy ORM models (Building, Room, Node, Connection, Course)
- `app/routes/` - API endpoints
- `app/schemas/` - Pydantic request/response schemas
- `app/utils/dijkstra.py` - shortest-path algorithm
- `tests/` - pytest unit tests
