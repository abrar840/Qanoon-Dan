from fastapi import APIRouter, HTTPException, Request
from app.schemas import AskRequest, AskResponse
from app.services.rag import answer
from app.services.crisis_router import (check_crisis, check_accusation, 
ACCUSATION_WARNING, ACCUSATION_RULE, check_minor_content, 
MINOR_REFUSAL, helpline_message,check_religion_content,RELIGION_REFUSAL)
from app.limiter import limiter, ASK_LIMIT

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
@limiter.limit(ASK_LIMIT)
def ask(request: Request, req: AskRequest):
    # `request` is needed by the limiter, which reads the caller's IP from it
    return answer_question(req)


def answer_question(req: AskRequest) -> AskResponse:
    """Everything /ask does, without the rate limit. scripts/run_eval.py calls this directly."""
    crisis = check_crisis(req.question)
    # 1. crisis without a legal answer: helpline only, no Gemini or Groq call
    if crisis and not crisis["legal_answer_too"]:
        return AskResponse(answer=crisis["message"], sources=[], crisis=True)
    # 2. minor rule: a request to write a story, example or FIR involving a child and a sexual
    # offence is refused here by code, before any LLM call (policy: sexual_offences.md, critical).
    # A parent whose child was harmed still gets the crisis helpline instead of the police line.
    if check_minor_content(req.question):
        help_text = crisis["message"] if crisis else helpline_message(["PK-POLICE-001"])
        return AskResponse(answer=MINOR_REFUSAL + "\n\n" + help_text, sources=[],
                           refused=True, crisis=bool(crisis))
    
     # religion sections: never write, quote or give examples (policy: blasphemy.md, critical)
    if check_religion_content(req.question):
        return AskResponse(answer=RELIGION_REFUSAL, sources=[], refused=True)
    
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

    # 2. crisis: helpline first, then the cited answer
    if crisis:
        if result.refused:
            # the legal part found nothing: show only the helpline, never a cold "I don't know"
            result.answer = crisis["message"]
            result.sources = []
            result.refused = False
        else:
            result.answer = crisis["message"] + "\n\n" + result.answer
        result.crisis = True

    return result