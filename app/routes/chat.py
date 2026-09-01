from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse
from app.services.llm import ask_groq



router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        reply = ask_groq(req.message, req.system_prompt, req.temperature)
        return ChatResponse(reply=reply, provider=req.provider,model="llama-.3-70b-versatile")
    except Exception as e:
        raise HTTPException(status_code=502,detail=f"LLm call failed:{e}")
