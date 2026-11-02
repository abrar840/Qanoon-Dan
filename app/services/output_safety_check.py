import re
import time
from pathlib import Path

import openai

from app.services.llm import client

POLICY_DIR = Path(__file__).resolve().parent.parent / "policies"

# loaded once at startup; a missing file stops the app (a safety rule must never switch off silently)
POLICIES = {}
for name in ["sexual_offences", "blasphemy", "killing"]:
    POLICIES[name] = (POLICY_DIR / f"{name}.md").read_text(encoding="utf-8")

# tried in order; on a rate limit (429) or error the next model is used
CHECKER_MODELS = ["openai/gpt-oss-safeguard-20b", "openai/gpt-oss-20b"]
MAX_WAIT_SECONDS = 20     # the user is waiting on a spinner; never longer than this

SAFETY_REFUSAL = ("I can't help with that request. I can explain what the law says, "
                  "for example the offence and its punishment.")
BUSY_REPLY = "High demand right now. Please ask again in a minute."


def policy_for_section(ref: str) -> str | None:
    m = re.match(r"\d+", ref)
    if not m:
        return None
    n = int(m.group())
    if ref == "292A" or 375 <= n <= 377 or n == 509:
        return "sexual_offences"
    if 295 <= n <= 298:
        return "blasphemy"
    if 299 <= n <= 338:
        return "killing"
    return None


def call_checker(model: str, messages: list[dict]):
    return client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0,
        reasoning_effort="low",        # the label is one word; long reasoning wastes the 2K tokens/min
        max_completion_tokens=1000,    # reasoning counts here too; too low = empty reply
    )


def verdict_from(response) -> str:
    label = (response.choices[0].message.content or "").strip().upper()
    if label.startswith("ALLOWED"):
        return "allowed"
    return "violates"                  # VIOLATES, empty or unclear: the policy says unsure = VIOLATES


def check_answer(question: str, answer: str, sections: list[str]) -> str:
    """Returns "not_sensitive", "allowed", "violates" or "unavailable"."""
    name = None
    for ref in sections:               # retrieval order: the closest sensitive section picks the policy
        name = policy_for_section(ref)
        if name:
            break
    if name is None:
        return "not_sensitive"

    messages = [{"role": "system", "content": POLICIES[name]},
                {"role": "user", "content": f"QUESTION:\n{question}\n\nANSWER:\n{answer}"}]

    wait = None
    for model in CHECKER_MODELS:
        try:
            return verdict_from(call_checker(model, messages))
        except openai.RateLimitError as e:
            wait = float(e.response.headers.get("retry-after", MAX_WAIT_SECONDS))
            print(f"[safety_check] {model} rate-limited, retry-after {wait}s")
        except Exception as e:
            print(f"[safety_check] {model} failed: {e}")   # shows config errors instead of hiding them

    # every model was rate-limited: wait once if Groq's wait is short, then retry the main checker
    if wait is not None and wait <= MAX_WAIT_SECONDS:
        time.sleep(wait)
        try:
            return verdict_from(call_checker(CHECKER_MODELS[0], messages))
        except Exception as e:
            print(f"[safety_check] retry failed: {e}")
    return "unavailable"               # nothing unchecked is ever shown