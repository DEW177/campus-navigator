# Contributing Guidelines

## Branching
- `main` - stable, deployable code only
- Feature branches: `feature/<short-description>` (e.g. `feature/navigation-api`)
- Open a pull request into `main`; at least one teammate reviews before merging.

## Commit messages
Use short, present-tense messages, e.g.:
```
Add Dijkstra shortest-path endpoint
Fix CORS config for local frontend
```

## Division of work
- **Partner 1 (Backend)**: `backend/` - API, database models, pathfinding algorithm
- **Partner 2 (Frontend)**: `frontend/` - UI, map, chat interface
- **Shared**: `database/schema.sql` - agree on schema changes together before editing

## Before pushing
- Backend: run `pytest` in `backend/`
- Frontend: run `npm test` in `frontend/`
- Never commit `.env` files (already in `.gitignore`)
