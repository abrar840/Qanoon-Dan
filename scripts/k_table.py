"""Day 16 Step 4: how many sections should we retrieve (K)? Retrieval only, no LLM calls.

Run from the Qanoon-Dan folder:  python -m scripts.k_table
"""
from dotenv import load_dotenv
load_dotenv()                       # keys first, embeddings.py reads them on import

import json
import time

from app.services.rag import retrieve

with open("tests/eval_set.json", encoding="utf-8") as f:
    questions = [q for q in json.load(f) if q["type"] == "legal"]   # only legal ones have an expected section

hits = {3: 0, 5: 0, 8: 0}          # K -> how many questions found a correct section in the top K

for q in questions:
    chunks = retrieve(q["question"], k=8)          # search once with the biggest K
    refs = [c.ref for c in chunks]                 # e.g. ["379", "378", "403", ...], closest first
    for k in hits:
        top_k = refs[:k]                           # the first k results of that same list
        if any(sec in top_k for sec in q["expected"]):
            hits[k] += 1
    print(f"#{q['id']} top 8: {', '.join(refs)}   expected: {', '.join(q['expected'])}")
    time.sleep(1)                                  # stay under the free embedding limit

print("\n| K | Retrieval hit-rate |\n|---|---|")
for k, n in hits.items():
    print(f"| {k} | {n}/{len(questions)} |")
