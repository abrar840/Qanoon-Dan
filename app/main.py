from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.routes.chat import router as chat_router
from app.routes.ask import router as ask_router
from fastapi.middleware.cors import CORSMiddleware 
#from appp.routes."file_name" import router as file_name_router


# ENVIRONMENT=production (set on Render) hides /docs, /redoc and /openapi.json, so the public
# server does not hand out a ready-made form for calling the API. Locally they stay on.
IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"

app = FastAPI(
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# per-IP rate limit on /ask (see app/limiter.py)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limited(request: Request, exc: RateLimitExceeded):
    # `detail` is what the UI shows the user, so it must be a friendly sentence
    if "day" in str(exc.detail):
        message = "You've reached today's question limit. Please come back tomorrow."
    else:
        message = "Too many questions in a short time. Please wait a minute and try again."
    return JSONResponse(status_code=429, content={"detail": message})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


app.include_router(ask_router)
# /chat is a dev-only test route: it calls Groq with a caller-supplied system prompt and none of
# the safety layers (no retrieval, refusal gate, crisis router or rate limit). Kept for later
# general-chat work, but never exposed on the public server.
if not IS_PRODUCTION:
    app.include_router(chat_router)
#following same way we need to register all routes here
@app.get("/health")
def health_check():
    return {"status" : "ok"}