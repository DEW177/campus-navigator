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
