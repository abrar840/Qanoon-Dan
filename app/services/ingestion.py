"""
Ingestion: PDF -> clean text -> one chunk per section.

Three steps, three functions:
  1. remove_footnotes()   drop the footnote block at the bottom of each page
  2. load_pdf_text()      read the PDF, clean it, cut off the table of contents
  3. chunk_by_section()   split the text where each section starts, e.g. "302. Punishment..."

Why chunk by section and not by a fixed size: a legal answer must cite a section.
If a chunk is exactly one section, the citation is always right and never half a section.
Result for the Pakistan Penal Code: 634 chunks (sections 1 to 511, some have A/B/C parts).
"""
from pypdf import PdfReader
import re

# ---- footnote cleaner -------------------------------------------------------
# A footnote line in this PDF looks like "1The words ..." or "2Subs. by Act ...":
# a small number glued to a capital letter. A real section looks like "52A." or
# "2[" (amendment bracket), so those are excluded by requiring a lowercase letter next.
FOOTNOTE_START = re.compile(r"^\d{1,3}[A-Z][a-z]")   # "1The", "2Subs.", "10Subs." (not "52A." or "2[*")

# A line where real body text starts again: a section number ("302. ", "337-A. ",
# "1[302. ") or a chapter heading ("CHAPTER XVI"). Used to make sure we only cut
# footnotes that sit at the END of a page, never body text in the middle.
BODY_START = re.compile(r"^\s*(\*?(?:\d{1,3}\[\s*)*\d{1,4}[A-Z]{0,2}\.\s|CHAPTER\s)")  # a section or chapter start

def remove_footnotes(page_text: str) -> str:
    """Return the page without its footnote block (the lines at the bottom)."""
    lines = page_text.split("\n")
    for i, line in enumerate(lines):
        # footnote block = looks like "1The..." AND no section/chapter starts after it on this page
        if FOOTNOTE_START.match(line.strip()) and not any(BODY_START.match(x) for x in lines[i + 1:]):
            return "\n".join(lines[:i])          # keep only the lines above the footnotes
    return page_text                             # no footnotes on this page, keep it all


def load_pdf_text(path: str) -> str:
    """Read every page, clean it, and return one big string that starts at Chapter I."""
    reader = PdfReader(path)
    pattern = r"Page \d+ of \d+\s*"                  # the page footer the PDF prints on every page
    replacement = ""
    # one string for the whole document; footnotes removed page by page BEFORE joining,
    # because a footnote block belongs to its page, not to the next one
    text = "\n".join(remove_footnotes(page.extract_text() or "") for page in reader.pages)
    text = re.sub(pattern, replacement, text)        # drop "Page 12 of 240"
    text = text.replace("\xad", "-")                 # soft hyphen (invisible) -> real hyphen, so "337-A" stays "337-A"

    #we have two occurence of this heading [Chapter I] but real chapter starts on the secnod occurence
    #so we will find all ocurence and then get second occurence
    # (the first "CHAPTER I" is in the table of contents, which would give us fake sections)
    chapters = [m.start() for m in re.finditer(r"CHAPTER I\b", text)]

    if len(chapters) >1:
        text = text[chapters[1]:]                    # from the real Chapter I to the END of the document
    return text


# ---- section splitter -------------------------------------------------------
# First attempt (kept for the story): matched the literal letters "A-Z", so "337-A." was missed. 483 chunks.
# SECTON_PATTERN = re.compile(r"\n\s*(\d{1,3}(?:A-Z)?)\.\s")
#
# Final version, piece by piece:
#   \n\s*                  a section always starts on a new line
#   \*?                    some sections start with "*" (marked in the PDF)
#   (?:\d{1,3}\[\s*)*      amendment markers before the number, e.g. "3[4[ 478."
#   (?:\d(?=\d{3}\.\s))?   a footnote digit glued to a 3-digit number, e.g. "1500." -> skip the "1"
#   (\d{1,3}|\d{2,3}-?[A-Z]{1,2})   the section number we keep: "302", "337-A", "489F"
#   \.\s                   the dot and space that follow every section number
# Tested against every section number 1-511. 634 chunks. Only 325 is missing: the Code itself omits it.
SECTON_PATTERN = re.compile(r"\n\s*\*?(?:\d{1,3}\[\s*)*(?:\d(?=\d{3}\.\s))?(\d{1,3}|\d{2,3}-?[A-Z]{1,2})\.\s")

def chunk_by_section(text:str) -> list[dict]:
    """Split the text into [{"section": "302", "text": "302. Punishment of ..."}, ...]."""
    matches = list(SECTON_PATTERN.finditer(text))
    #every place a section starts
    chunks = []
    for i, m in enumerate(matches):
        section = m.group(1)
        #the number , e.g. "302"  or "337-A"

        start = m.start()
        """where this section begins
        this chunk ends where the NEXT section begins
        (or at the end of document )
        """

        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        chunk_text = text[start:end].strip()
        if len(chunk_text) < 50:
            #pdf noise (a stray number that looked like a section but has no text after it)
            continue
        chunks.append({"section": section, "text": chunk_text})

    return chunks


if __name__ == "__main__":
    # quick manual check: run `python -m app.services.ingestion` from the repo root
    text = load_pdf_text("data/raw/ppc.pdf")
    print("=== RAW TEXT SAMPLE ===")
    print(text[:2000])

    chunks = chunk_by_section(text)
    print(f"\nTotal chunks: {len(chunks)}")
    for c in chunks[:5]:
        print(f"\n--- Section {c['section']} ---")
        print(c["text"])
