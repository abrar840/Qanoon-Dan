import json
from pathlib import Path

_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "helplines.json"
with open(_PATH, encoding='utf-8') as f:
    all_helplines = json.load(f)
    
# keep verified numbers
HELPLINES = {}
for h in all_helplines:
    if h["verification_status"]=="official_source_found":
        HELPLINES[h["id"]]=h

CRISIS = {
    "self_harm": {
        "phrases": ["kill myself", "want to die", "end my life", "commit suicide",
                    "end her life", "end his life", "kill herself", "kill himself"],
        "helplines": ["PK-MH-001", "PK-POLICE-001"],
        "legal_answer_too": False,
    },
    "threat_to_others": {
        "phrases": ["if i kill", "i will kill", "i want to kill", "should i kill",
                    "kill her for", "kill him for"],
        "helplines": ["PK-POLICE-001"],
        "legal_answer_too": False,
    },
    "violence_at_home": {
        "phrases": ["beats me", "hits me", "husband beat", "afraid of my husband", "threatening to kill me"],
        "helplines": ["PK-WOMEN-001", "PK-POLICE-001"],
        "legal_answer_too": True,
    },
    "sexual_violence": {
        "phrases": ["raped me", "i was raped", "sexually assaulted me", "molested"],
        "helplines": ["PK-WOMEN-001", "PK-POLICE-001"],
        "legal_answer_too": True,
    },
    "child_in_danger": {
        "phrases": ["abusing my child", "my child is being abused", "child is being beaten"],
        "helplines": ["PK-POLICE-001"],
        "legal_answer_too": True,
    },
}

def helpline_message(ids: list[str]) -> str:
    message = "If you or someone else is in danger, please contact:"
    for helpline_id in ids:
        h = HELPLINES.get(helpline_id)
        if h is None:          # not verified yet, so skip it
            continue
        message += f"\n- {h['name']}: {h['phone']} ({h['geographic_scope']})"
    return message
    
       
def check_crisis(query: str)->dict | None:
    q = query.lower()
    for topic, cfg in CRISIS.items():
        for phrase in cfg["phrases"]:
            if phrase in q:
                return{
                    "topic":topic,
                    "message": helpline_message(cfg['helplines']),
                    "legal_answer_too": cfg["legal_answer_too"],
                }
    return None
            
    