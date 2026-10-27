from fastapi import APIRouter, HTTPException
from app.schemas import AskRequest, AskResponse
from app.services.rag import answer

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    try:
        return answer(req.question, k=req.k)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Answer failed: {e}")
