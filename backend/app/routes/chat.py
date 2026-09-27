from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/ask")
def ask(request: ChatRequest):
    """
    POST /api/chat/ask
    Body: { "message": "How do I get to SC06-301?" }
    Placeholder for a natural-language chat/search interface over the campus data.
    """
    return {"reply": f"You asked: '{request.message}'. Chat logic not implemented yet."}
