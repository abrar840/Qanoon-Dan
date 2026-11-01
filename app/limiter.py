"""One rate limiter for the whole app, keyed by the caller's IP address.

Why: the backend URL is visible in the UI's JavaScript, so anyone could call /ask in a loop and use
up the free Groq quota (8,000 tokens per minute, 1,000 requests per day) for everyone.

Behind Render's proxy, uvicorn must run with --proxy-headers, otherwise every request seems to
come from the proxy's IP and all users share one limit.
Counts are kept in memory, so they reset when the server restarts. That is fine for v1.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# per IP: a short burst limit and a daily cap
ASK_LIMIT = "4/minute;30/day"
