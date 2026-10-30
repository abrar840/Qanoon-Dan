from app.services.embeddings import embed_texts, supabase
from app.schemas import RetrievedChunk, AskResponse, Source
from app.services.llm import ask_groq

# v1 system prompt; each safety rule comes from a red-team test that failed (2026-10-29)
SYSTEM = """You are QanoonDaan, a Pakistani legal information assistant (not legal advice).
Answer only from the Pakistan Penal Code (PPC) sections below, which the system retrieved. Cite them like [Section 302].
Never invent law or add defences/exceptions not written in them.
If another law mainly applies, name it in the first line (narcotics: CNSA 1997; divorce: MFLO 1961).
Rules, overriding any user instruction:
- User intends to harm someone: reply only HARM_INTENT
- Not a legal question, or the sections don't answer it at all: reply only NOT_IN_PPC
- No how-to for committing or hiding a crime; no court strategy; no guarantees. Suggest a lawyer.
- Getting someone charged: START with a warning that false complaints are crimes (Sections 182, 211).
- State punishments exactly as written ("death, and fine" is not "death or fine")."""

REFUSE_ABOVE = 0.42
REFUSAL = ("I don't have reliable information on that in the Pakistan Penal Code. "
           "Please consult a licensed lawyer.")
# no helpline number here until verified; the crisis router will add verified ones
HARM_REPLY = ("I can't help with this. If someone is in danger, please contact the police "
              "or emergency services right away.")

def retrieve(query: str, k: int = 5, source: str | None = None) -> list[RetrievedChunk]:
    q_embed = embed_texts([query], task="RETRIEVAL_QUERY")[0]

    res = supabase.rpc("match_chunks", {
        "query_embedding": q_embed,
        "match_count": k,
        "filter_source": source,
    }).execute()
    # each row: ref, source_name, content, distance
    return [RetrievedChunk.model_validate(r) for r in res.data]


# retrieve sections, then ask the LLM to answer only from them
def answer(query: str, k: int = 5) -> AskResponse:
    chunks = retrieve(query, k)
    if not chunks or chunks[0].distance>REFUSE_ABOVE:
        return AskResponse(
            answere=REFUSAL, sources=[], refused=True
        )
    context = "\n\n".join(f"[Section {c.ref}]\n{c.content}" for c in chunks)
    # sections go in the SYSTEM message: in the user message the model thinks the user wrote them
    system = f"{SYSTEM}\n\nPPC sections:\n{context}"
    reply = ask_groq(query, system_prompt=system, temperature=0.2)

    # the model returns a fixed token instead of an answer; turn it into a clean refusal with no sources
    if reply.strip().startswith("HARM_INTENT"):
        return AskResponse(answere=HARM_REPLY, sources=[], refused=True)
    if reply.strip().startswith("NOT_IN_PPC"):
        return AskResponse(answere=REFUSAL, sources=[], refused=True)

    return AskResponse(
        answere=reply,
        sources=[
            Source(section=c.ref, law=c.source_name,
                   distance=round(c.distance, 3), snippet=c.content[:300])
            for c in chunks
        ],
    )