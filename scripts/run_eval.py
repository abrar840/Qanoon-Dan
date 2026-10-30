"""Day 16: ask every eval question through the real /ask code and count passes.

Run from the Qanoon-Dan folder:  python -m scripts.run_eval
"""
from dotenv import load_dotenv
load_dotenv()                       # keys first, embeddings.py reads them on import

import json
import sys
import time

from fastapi import HTTPException

from app.routes.ask import ask
from app.schemas import AskRequest

sys.stdout.reconfigure(encoding="utf-8")     # so Urdu and curly quotes print on Windows

with open("tests/eval_set.json", encoding="utf-8") as f:
    questions = json.load(f)


def check(q, res):
    """True or False for the types the script can check. None means: you read it and decide."""
    if q["type"] == "legal":
        found = [s.section for s in res.sources]
        return any(sec in found for sec in q["expected"])     # was a correct section retrieved?
    if q["type"] == "refuse":
        return res.refused
    if q["type"] == "crisis":
        return res.crisis == q["expected_crisis"]
    return None                                              # safety and known_limit


passed = {}        # type -> how many passed
total = {}         # type -> how many were checked
missed_crisis = []
times = []
report = []        # lines for the results file

for q in questions:
    runs = 3 if q["type"] == "safety" else 1               # safety answers vary, so run them 3 times
    for run in range(runs):
        start = time.perf_counter()
        try:
            res = ask(AskRequest(question=q["question"]))
        except HTTPException as e:                         # ask() turns any failure (e.g. Groq rate limit) into this
            print(f"#{q['id']} ERROR: {e}")
            report.append(f"### #{q['id']} {q['question']}\nERROR: {e}\n")
            continue
        seconds = time.perf_counter() - start
        times.append(seconds)

        result = check(q, res)
        if result is not None:
            total[q["type"]] = total.get(q["type"], 0) + 1
            passed[q["type"]] = passed.get(q["type"], 0) + int(result)
        if q["type"] == "crisis" and q["expected_crisis"] and not result:
            missed_crisis.append(q["question"])

        label = {True: "PASS", False: "FAIL", None: "MARK BY HAND"}[result]
        sources = ", ".join(s.section for s in res.sources) or "none"
        print(f"#{q['id']} {q['type']} {label} ({seconds:.1f}s) sources: {sources}")

        report.append(f"### #{q['id']} ({q['type']}, run {run + 1}) {q['question']}")
        report.append(f"Result: {label} | crisis: {res.crisis} | refused: {res.refused} | sources: {sources}")
        report.append(f"Expected: {q.get('expected') or q.get('pass_when') or q.get('note', '')}")
        report.append(f"\n{res.answer}\n")
        time.sleep(3)                                      # stay under the free-tier limits

# ---- summary ----
summary = ["## Summary"]
for t, n in total.items():
    summary.append(f"- {t}: {passed[t]}/{n}")
summary.append(f"- MISSED crisis questions: {len(missed_crisis)} {missed_crisis}")
if times:
    summary.append(f"- latency: average {sum(times) / len(times):.1f}s, slowest {max(times):.1f}s")
summary.append("- safety and known_limit: read the answers below and mark them yourself")

print("\n".join(summary))
with open("../../docs/eval-results.md", "w", encoding="utf-8") as f:
    f.write("# Eval results\n\n" + "\n".join(summary) + "\n\n## Answers\n\n" + "\n".join(report))
print("Saved to Qanoon-dan/docs/eval-results.md")
