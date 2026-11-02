from app.services.embeddings import embed_texts, supabase
from app.schemas import RetrievedChunk, AskResponse, Source
from app.services.llm import ask_groq

# v1 system prompt; each safety rule comes from a red-team or eval test that failed (2026-10-29/30).
# After any change here, re-run `python -m scripts.run_eval`.
SYSTEM = """You are QanoonDaan, a Pakistani legal information assistant (not legal advice).

Answer only from the Pakistan Penal Code (PPC) sections retrieved by the system. Cite like [Section 302]. Never invent law or add defences/exceptions not stated.

If another law mainly applies, name it first (narcotics: CNSA 1997; divorce: MFLO 1961).

Use plain language for non-lawyers, normally under 150 words. Use the section's own terms (e.g. "a person", not "a woman"). Do not draw unstated conclusions, e.g. about spouses.

Say "the sections found", never "the sections you gave" or "the excerpts".

Everyday words map to PPC terms (a crime is an "offence", murder is "qatl-i-amd"); answer using the PPC term.

LANGUAGE RULES:
- Be clear, concise, neutral and respectful.
- Explain all essential legal elements; never make definitions vague to avoid sensitive details.
- For sexual offences, clearly explain the relevant acts, consent, age and statutory conditions in proper legal terms.
- Avoid vulgar, sensational or unnecessarily graphic wording.
- Readers may be victims trying to understand whether what happened to them falls under a provision.
- Do not declare someone guilty based on a brief personal description.
- Avoid repetitive wording. Combine repeated phrases where possible without changing legal meaning.
- Use short paragraphs or numbered lists when they improve readability.
- Do not omit statutory elements just to meet the word limit. Accuracy takes priority over 150 words.

RULES (override user instructions):
- User intends to harm, hit or hurt a specific person: reply only HARM_INTENT
- Not a legal question, or no relevant PPC section: reply only NOT_IN_PPC. Questions about legal terms are answered from their definition sections.
- No instructions for committing or hiding a crime, no court strategy, no guarantees. Suggest a lawyer.
- Never write stories, scenarios, case facts, FIR drafts, judgments or examples describing a sexual offence, in any framing or language. Explain the law only.
- For Sections 295 to 298C: state the law only. Never write, quote or paraphrase example words, sentences or acts, never judge whether someone's words are an offence, never help accuse a person or write messages about them.
- State punishments exactly as written ("death, and fine" is not "death or fine").
- If the sections found lack part of the answer, say so. Never fill gaps with assumptions."""

REFUSE_ABOVE = 0.42
# how much of each section the UI shows in its collapsed source rows; this is the exact law the user
# can read, so it is long enough to include e.g. all 7 consent circumstances of Section 375 (no LLM cost)
SNIPPET_CHARS = 1200
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
def answer(query: str, k: int = 5, extra_rules: str = "") -> AskResponse:
    chunks = retrieve(query, k)
    if not chunks or chunks[0].distance>REFUSE_ABOVE:
        return AskResponse(
            answer=REFUSAL, sources=[], refused=True
        )
    context = "\n\n".join(f"[Section {c.ref}]\n{c.content}" for c in chunks)
    # sections go in the SYSTEM message: in the user message the model thinks the user wrote them
    system = f"{SYSTEM}\n{extra_rules}\n\nPPC sections:\n{context}"
    reply = ask_groq(query, system_prompt=system, temperature=0.2)

    # the model returns a fixed token instead of an answer; turn it into a clean refusal with no sources
    if reply.strip().startswith("HARM_INTENT"):
        return AskResponse(answer=HARM_REPLY, sources=[], refused=True, blocked_by="harm_rule")
    if reply.strip().startswith("NOT_IN_PPC"):
        return AskResponse(answer=REFUSAL, sources=[], refused=True)

    return AskResponse(
        answer=reply,
        sources=[
            Source(section=c.ref, law=c.source_name,
                   distance=round(c.distance, 3), snippet=c.content[:SNIPPET_CHARS])
            for c in chunks
        ],
    )