from dotenv import load_dotenv
load_dotenv()                       # keys first, embeddings.py reads them on import

from app.services.rag import retrieve

QUESTIONS = [
    "What is the punishment for murder?",                            # expect 302
    "Someone stole my phone",                                        # expect 378 / 379
    "My cheque bounced, what can happen to the person who gave it?", # expect 489F
    "Someone cheated me in a property deal",                         # expect 420
    "What is the punishment for causing hurt?",                      # expect 337 range
    "How do I file my income tax?",                                  # expect junk, note the distance
]

for q in QUESTIONS:
    print(f"\nQ: {q}")
    for c in retrieve(q, k=5):
        print(f"  {c.ref:>6}  {c.distance:.3f}  {c.content[:80]!r}")
