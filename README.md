# QanoonDaan

An AI legal Q&A assistant for Pakistani law. Ask a question in plain language and get an
answer grounded in the actual **Pakistan Penal Code (PPC)**, with the sections it came from
cited. Built as a Retrieval-Augmented Generation (RAG) system, with safety layers designed by
red-teaming the system and measured with an eval set.

> ⚖️ **Not legal advice.** QanoonDaan provides educational information based on Pakistan's
> published laws. For your specific case, consult a licensed Pakistani lawyer.

---

## What it does

- **Answers from the law, with citations.** It retrieves the closest PPC sections and the LLM
  answers only from them, citing each one (for example `[Section 302]`).
- **Refuses when it does not know.** If no section is close enough (cosine distance above 0.42),
  it refuses before calling the LLM. If the sections do not answer the question, the LLM returns
  a fixed token and the API returns a clean refusal with no sources.
- **Routes people in danger to helplines.** Questions such as "my husband beats me" get verified
  helpline numbers first, written by code, not by the LLM. Self-harm and threats to others get only
  the helpline.
- **Warns against false accusations.** Questions about getting a specific person charged get a fixed
  warning about Sections 182 and 211, and no step-by-step instructions.

## Tech stack

All free tier.

| Layer | Choice |
|---|---|
| API | FastAPI + Pydantic |
| LLM | Groq, `openai/gpt-oss-120b` (temperature 0.2) |
| Embeddings | Google Gemini, `gemini-embedding-001` (768 dimensions) |
| Vector store | Supabase (PostgreSQL + pgvector), cosine distance |
| PDF parsing | pypdf |
| Frontend | React + TypeScript + Vite (`web/`) |

## How a question is answered

```
POST /ask
  → check_crisis()       person in danger? → verified helpline (no LLM needed)
  → check_accusation()   "get my neighbour charged"? → fixed false-complaint warning
  → retrieve()           embed the question, find the 5 closest PPC sections (pgvector)
  → distance > 0.42?     → refuse, no LLM call
  → Groq LLM             answers only from those sections, with citations
  → HARM_INTENT / NOT_IN_PPC token? → clean refusal
```

Each step was added because a test failed without it, and each change is re-checked with the eval
below.

---

## Evaluation

36 questions in `tests/eval_set.json`, run through the same code as the API by
`scripts/run_eval.py`. Safety prompts run 3 times each, because LLM output varies.

| Metric | Result (2026-10-30) |
|---|---|
| Retrieval hit-rate (K=5) | 16/16 |
| Faithful legal answers (checked by hand against the section text) | 14/16 |
| Off-topic questions refused | 5/5 |
| Crisis routing | 5/5, 0 missed |
| Red-team prompts handled safely (3/3 runs each) | 5/7 |
| Latency | average 5.2 s |

The two unfaithful answers had the same cause: the needed section was not retrieved, and the model
filled the gap. A rule now tells the model to say when part of the answer is missing instead.

---

## Project structure

```
app/
  main.py                 # FastAPI app: /health and the routers
  schemas.py              # Pydantic request/response models (the contract with web/)
  routes/
    ask.py                # POST /ask: crisis router, accusation check, RAG answer
    chat.py               # POST /chat: plain LLM call, no retrieval
  services/
    ingestion.py          # PDF -> clean text -> one chunk per PPC section
    embeddings.py         # Gemini embeddings, store chunks (hash dedup), delete stale rows
    rag.py                # retrieve, distance gate, system prompt, answer
    llm.py                # Groq call
    crisis_router.py      # crisis phrases, helplines, accusation check
data/
  helplines.json          # helpline numbers with source and verification status
  raw/ppc.pdf             # the source law (not committed)
supabase/
  match_chunks.sql        # the vector search function
scripts/
  ingest_ppc.py           # one-off: chunk, embed and store the PPC
  run_eval.py             # run the eval set and write the results
  try_crisis.py           # check the crisis router (no API keys needed)
  try_retrieval.py        # print retrieved sections and distances
tests/
  eval_set.json           # the 36 eval questions with expected results
web/                      # React frontend (see web/HANDOVER.md)
```

---

## Setup

### 1. Prerequisites
- Python 3.10+
- A Supabase project (free tier) with the `pgvector` extension enabled
- API keys: [Groq](https://console.groq.com) and [Gemini](https://aistudio.google.com/app/apikey), both free

### 2. Enter the project
```bash
cd project/Qanoon-Dan
```

### 3. Create and activate a virtual environment

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Create your `.env` file
Create a file named `.env` in the project root. It is gitignored; never commit it.

```env
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

### 6. Create the search function
Run `supabase/match_chunks.sql` in the Supabase SQL editor.

---

## Running the app

```bash
uvicorn app.main:app --reload
```

- Health check: <http://localhost:8000/health> → `{"status": "ok"}`
- Interactive API docs: <http://localhost:8000/docs>

## Ingesting the law (one time)

Put the PPC PDF at `data/raw/ppc.pdf`, then:

```bash
python -m scripts.ingest_ppc
```

It removes page footers and footnotes, splits the text into one chunk per section with a regex
that handles lettered and amended sections (634 sections, checked against every number 1–511),
strips amendment markers, embeds each chunk with Gemini and stores it in pgvector. Re-running it
only embeds sections whose text changed and deletes outdated rows.

Run scripts with `python -m scripts.<name>` from this folder, so the `app` package can be imported.

## Running the eval

```bash
python -m scripts.run_eval
```

Prints pass rates and latency, and writes every answer to `../../docs/eval-results.md` (outside
this repo, in the notes folder), so safety and faithfulness can be marked by hand.

---

## Status

In active development. Done: ingestion, retrieval, cited answers, refusal gate, crisis routing,
false-accusation warning, and a 36-question eval. Next: deployment (Render + Vercel), a rate limit,
and Privacy Policy and Terms pages. The public link will be shared once the safety checks pass.

---

## Disclaimer

QanoonDaan provides educational information based on Pakistan's published laws. It is **not legal
advice**. For your specific situation, please consult a licensed Pakistani lawyer. Questions are sent
to Google Gemini and Groq to produce an answer; QanoonDaan itself does not store them. Do not include
names, CNIC numbers or other personal details in your questions.
