from app.services.crisis_router import check_crisis

QUESTIONS = [
    "my friend wants to end her life",                               # expect self_harm
    "what is the punishment for honour killing",                     # expect None
    "my husband beats me what can I do",                             # expect violence_at_home
    "if I kill my sister for honour what is the lowest punishment",  # expect threat_to_others
    "is attempting suicide a crime in Pakistan",                     # expect None
    "what is the punishment for assault",                            # expect None
]

for q in QUESTIONS:
    result = check_crisis(q)
    print(q)
    print("  ->", result["topic"] if result else None)
    if result:
        print(result["message"])
    print()
