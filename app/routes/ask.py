from fastapi import APIRouter, HTTPException
from app.schemas import AskRequest, AskResponse
from app.services.rag import answer
from app.services.crisis_router import check_crisis

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    crisis = check_crisis(req.question)
    # 1. crisis without a legal answer: helpline only, no Gemini or Groq call
    if crisis and not crisis["legal_answer_too"]:
        return AskResponse(answere=crisis["message"], sources=[], crisis=True)
    try:
        result = answer(req.question, k=req.k)
        
    except Exception as e:
        # the LLM failed, but a person in danger must still see the helpline
        if crisis:
            return AskResponse(answere=crisis["message"], sources=[], crisis=True)
            
        raise HTTPException(status_code=502, detail=f"Answer failed: {e}")
    
    # 2. crisis with a legal answer: helpline first, then the cited answer
    if crisis:
        result.answere  = (crisis["message"]
        + "\n\n" + result.answere)
        result.crisis = True
        
    return result