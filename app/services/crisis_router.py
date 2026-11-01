import json
from pathlib import Path
import re
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
        "phrases": ["raped me", "i was raped", "raping me", "rapes me", "sexually assaulted me", "molested",
                    "forces me to have sex", "forced me to have sex", "forcing me to have sex", "forced sex with me"],
        "helplines": ["PK-WOMEN-001", "PK-POLICE-001"],
        "legal_answer_too": True,
    },
    "child_in_danger": {
        "phrases": ["abusing my child", "my child is being abused", "child is being beaten"],
        "helplines": ["PK-POLICE-001"],
        "legal_answer_too": True,
    },
    # last on purpose: the topics above are more specific, so they win when both match
    # ("he is trying to kill me" was missed on 2026-10-30: no phrase said "trying to")
    "immediate_danger": {
        "phrases": ["kill me", "trying to kill", "attacking me", "attacked me", "stabbed me", "shot me",
                    "kidnapped me", "holding me"],
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

# questions about getting a specific person charged (found by red-teaming: 295C accusation guide)
ACCUSATION_PHRASES = ["get him charged", "get her charged", "get my neighbour charged",
                      "get someone charged", "file a case against", "register an fir against",
                      "accuse him of", "accuse her of", "get him arrested", "get her arrested"]

ACCUSATION_WARNING = ("Warning: a false complaint is itself a crime. Under Section 182 and Section 211 "
                      "of the PPC, falsely charging someone with an offence punishable with death can "
                      "lead to up to 7 years' imprisonment.")

# sent to the LLM only for these questions, so normal victim questions never get it
ACCUSATION_RULE = ("- The user wants a specific person charged: explain the offence only. "
                   "Do not list steps to accuse them; advise a licensed lawyer.")


def check_accusation(query: str) -> bool:
    q = query.lower()
    for phrase in ACCUSATION_PHRASES:
        if phrase in q:
            return True
    return False






#minor section we are adding this tuff to refuse even before llm cal it will save tokens as well as the anseer will also be th quckiest 
SEXUAL_WORDS = ["rape", "sexual", " sex", "sodomy", "molest", "zyadti", "badfeli",
                "زیادتی", "بدفعلی", "375", "376", "377"]

MINOR_WORDS = ["child", " kid", "minor", "underage", "under age", "under 18", "under 16",
               "under eighteen", "under sixteen", "teen", "schoolgirl", "schoolboy", "school girl",
               "school boy", "school student", "little girl", "little boy", " baby", "infant",
               " bacha", " bachay", " bache", " bachi", " bachchi", " bachon", "nabalig", "kamsin",
               "بچہ", "بچی", "بچے", "بچوں", "نابالغ", "کمسن"]

# ages 1-17: "14 year old", "14 saal ki", "aged 14" (not "10 years" alone: that is a punishment)
MINOR_AGE_RE = re.compile(r"\b(?:[1-9]|1[0-7])\s*(?:years?|yrs?|saal|sal|سال)\s*(?:old|ka|ki|ke|کا|کی|کے)\b"
                          r"|\baged?\s*(?:of\s*)?(?:[1-9]|1[0-7])\b")

# only words that ask for writing: victims and parents say "details", "facts", "statement", "FIR"
CONTENT_REQUEST_WORDS = ["write", "draft", "story", "stories", "scenario", "example", "sample", "narrat",
                         "role play", "roleplay", "fill in", "fill the", "translate", "script", "dialogue",
                         " likh", "kahani", "misal", "misaal", "namoona", "namuna",
                         "لکھ", "کہانی", "مثال", "نمونہ"]

MINOR_REFUSAL = ("I can't write stories, case facts, statements or examples that involve a child. "
                 "If a child has been harmed, please contact the police right away; they will record "
                 "the statement, and a licensed lawyer can help with the case. You can still ask what "
                 "the law says, for example the punishment under a section.")

            
    
def has_any(text: str, words: list[str]) -> bool:
    for w in words:
        if w in text:
            return True
    return False


def check_minor_content(query: str) -> bool:
    # punctuation becomes spaces, so "under-18" and "14-year-old" match
    text = " " + re.sub(r"[^\w\s]", " ", query.lower()) + " "
    minor = has_any(text, MINOR_WORDS) or MINOR_AGE_RE.search(text) is not None
    return minor and has_any(text, SEXUAL_WORDS) and has_any(text, CONTENT_REQUEST_WORDS)







#section for the sesinitive section 295 to 298 this is not enough as guard rails we will also use an output cher rmodel 
RELIGION_WORDS = ["295", "296", "297", "298", "blasphem", "tauheen", "toheen", "gustakh", "holy prophet",
                  "prophet", " nabi", "rasool", "rasul", "quran", "توہین", "گستاخ", "رسول", "نبی", "قرآن"]

EXAMPLE_REQUEST_WORDS = ["write", "draft", "example", "sample", "sentence", "dialogue", "script", "story",
                         "quote", "message", "post", "translate", "fill in", " likh", "misal", "misaal",
                         "jumla", "jumle", "kahani", "paigham", "لکھ", "مثال", "جملہ", "جملے", "کہانی", "پیغام"]

RELIGION_REFUSAL = ("I can't write, quote or give examples of words or acts under Sections 295 to 298C, "
                    "judge anyone's words, or write messages about a person. I can explain what these "
                    "sections say and their punishments. A false accusation is itself an offence "
                    "under Sections 182 and 211.")


def check_religion_content(query: str) -> bool:
    text = " " + re.sub(r"[^\w\s]", " ", query.lower()) + " "
    return has_any(text, RELIGION_WORDS) and has_any(text, EXAMPLE_REQUEST_WORDS)