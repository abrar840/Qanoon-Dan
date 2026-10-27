from app.services.embeddings import embed_texts, supabase
from app.schemas import RetrievedChunk, AskResponse, Source
from app.services.llm import ask_groq

# generic system prompt for v1, we will improve it in next versions
SYSTEM = """You are QanoonDaan, a legal information assistant for Pakistan.
Answer ONLY from the Pakistan Penal Code (PPC) sections at the end of this message. Refer to them as "the PPC".
"Drugs" in a question usually means narcotics, unless it mentions medicine.
If another law mainly governs the question, say so in the first line and name it
(e.g. drug dealing or narcotics: Control of Narcotic Substances Act 1997; divorce: Muslim Family Laws Ordinance 1961).
If the question can be read two ways, cover both briefly.
Cite only sections given below, like [Section 302]. If they do not answer the question, say so.
Do not invent law. This is legal information, not legal advice."""



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
    context = "\n\n".join(f"[Section {c.ref}]\n{c.content}" for c in chunks)
    # sections go in the SYSTEM message: in the user message the model thinks the user wrote them
    system = f"{SYSTEM}\n\nPPC sections:\n{context}"
    reply = ask_groq(query, system_prompt=system, temperature=0.2)

    return AskResponse(
        answer=reply,
        sources=[
            Source(section=c.ref, law=c.source_name,
                   distance=round(c.distance, 3), snippet=c.content[:300])
            for c in chunks
        ],
    )
