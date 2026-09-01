# QanoonDaan

An AI legal Q&A assistant for Pakistani law. Ask a question in plain language and get an
answer grounded in the actual **Pakistan Penal Code (PPC)** — with the section it came from,
cited. Built as a Retrieval-Augmented Generation (RAG) system.

> ⚖️ **Not legal advice.** QanoonDaan provides educational information based on Pakistan's
> published laws. For your specific case, consult a licensed Pakistani lawyer.

---

## What it does

- Answers legal questions grounded in the PPC (no made-up law).
- Cites the **exact section** each answer is based on.
- Refuses to answer when it isn't confident enough (no hallucinated legal claims).
- Routes crisis topics (e.g. domestic violence, assault) to helplines, not raw legal text.

## Tech stack

All free-tier — no paid API keys required.

| Layer | Choice |
|---|---|
| API framework | FastAPI + Pydantic |
| LLM | Groq (Llama 3.3 70B) |
| Embeddings | Google Gemini (`text-embedding-004`) |
| Vector store | Supabase (PostgreSQL + pgvector) |
| PDF parsing | pypdf |

---

## Project structure

```
app/
  main.py                 # FastAPI app entry point (health check + routers)
  schemas.py              # Pydantic request/response models
  routes/
    chat.py               # chat / ask endpoints
  services/
    llm.py                # Groq / Gemini call logic
    ingestion.py          # PDF -> chunks -> embeddings
    rag.py                # retrieve + build grounded answer
    crisis_router.py      # crisis-topic detection + helpline routing
scripts/
  ingest_ppc.py           # one-off: ingest the PPC PDF into the vector store
tests/
requirements.txt
```

---

## Setup

### 1. Prerequisites
- Python 3.10+
- A Supabase project (free tier) with the `pgvector` extension enabled
- API keys: [Groq](https://console.groq.com) and [Gemini](https://aistudio.google.com/app/apikey) — both free

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
Create a file named `.env` in the project root (it is gitignored — never commit it):

```env
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_key
```

---

## Running the app

Start the development server:
```bash
uvicorn app.main:app --reload
```

Then check it's alive:
- Health check: <http://localhost:8000/health> → should return `{"status": "ok"}`
- Interactive API docs: <http://localhost:8000/docs>

---

## Ingesting the law (one-time)

Before the app can answer questions, the PPC has to be chunked, embedded, and stored:

```bash
python scripts/ingest_ppc.py
```

This reads the PPC PDF, splits it section by section (`Section \d+`), embeds each section
with Gemini, and stores the vectors in Supabase pgvector. Run once (re-run only when the
source law changes).

---

## Status

This project is under active development. For the current build stage, what's done, and what
file to work on next, see [`docs/project-status.md`](../../docs/project-status.md).

---

## Disclaimer

QanoonDaan provides educational information based on Pakistan's published laws. It is **not
legal advice**. For your specific situation, please consult a licensed Pakistani lawyer. We do
not store your queries or share your information.
