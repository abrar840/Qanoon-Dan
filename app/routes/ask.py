from fastapi import APIRouter, HTTPException
from app.schemas import AskRequest, AskResponse
from app.services.rag import answer
from app.services.crisis_router import check_crisis, check_accusation, ACCUSATION_WARNING, ACCUSATION_RULE

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    crisis = check_crisis(req.question)
    # 1. crisis without a legal answer: helpline only, no Gemini or Groq call
    if crisis and not crisis["legal_answer_too"]:
        return AskResponse(answer=crisis["message"], sources=[], crisis=True)
    accusation = check_accusation(req.question)
    try:
        result = answer(req.question, k=req.k,
                        extra_rules=ACCUSATION_RULE if accusation and not crisis else "")
        
    except Exception as e:
        # the LLM failed, but a person in danger must still see the helpline
        if crisis:
            return AskResponse(answer=crisis["message"], sources=[], crisis=True)
            
        raise HTTPException(status_code=502, detail=f"Answer failed: {e}")
    
    # accusation questions: the fixed false-complaint warning goes above the answer
    # (never for a crisis: that person is a victim, and a warning would discourage reporting)
    if accusation and not crisis:
        result.answer = ACCUSATION_WARNING + "\n\n" + result.answer

    # 2. crisis with a legal answer: helpline first, then the cited answer
    if crisis:
        result.answer  = (crisis["message"]
        + "\n\n" + result.answer)
        result.crisis = True
        
    return result