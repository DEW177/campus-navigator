"""
FastAPI application entry point.
Run with: uvicorn app.main:app --reload
"""
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import buildings, rooms, navigation, courses, chat, floors, outdoor

app = FastAPI(
    title="Campus Navigator API",
    description="API for the Web-Based Classroom Navigation System",
    version="0.1.0",
)

# Allow the React frontend (localhost:3000) to call this API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
app.include_router(floors.router, prefix="/api/floors", tags=["Floors"])
app.include_router(buildings.router, prefix="/api/buildings", tags=["Buildings"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(navigation.router, prefix="/api/navigate", tags=["Navigation"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(outdoor.router, prefix="/api/outdoor", tags=["Outdoor"])


@app.get("/")
def read_root():
    return {"message": "Campus Navigator API is running"}
