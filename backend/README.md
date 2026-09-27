# Campus Navigator - Backend

FastAPI backend for the Web-Based Classroom Navigation System.

## Setup

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then edit DATABASE_URL
python -m app.migrations.upgrade
python -m app.database.load_demo  # optional outside Docker: adds the marked demo building
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs` once running.

## Structure
- `app/models/` - SQLAlchemy ORM models (Building, Floor, Room, Node, Connection, Course)
- `app/routes/` - API endpoints
- `app/schemas/` - Pydantic request/response schemas
- `app/utils/dijkstra.py` - shortest-path algorithm
- `app/services/` - floor segments and landmark-based directions
- `app/migrations/` - additive database upgrades; run before starting the API
- `data/indoor_demo.json` - versioned simulated graph and room data
- `app/static/` - floor plans and landmark illustrations
- `tests/` - pytest unit tests
