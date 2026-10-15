from pypdf import PdfReader
import re 

#footnote cleaner
FOOTNOTE_START = re.compile(r"^\d{1,3}[A-Z][a-z]")   # "1The", "2Subs.", "10Subs." (not "52A." or "2[*")
BODY_START = re.compile(r"^\s*(\*?(?:\d{1,3}\[\s*)*\d{1,4}[A-Z]{0,2}\.\s|CHAPTER\s)")  # a section or chapter start

def remove_footnotes(page_text: str) -> str:
    lines = page_text.split("\n")
    for i, line in enumerate(lines):
        # footnote block = looks like "1The..." AND no section/chapter starts after it on this page
        if FOOTNOTE_START.match(line.strip()) and not any(BODY_START.match(x) for x in lines[i + 1:]):
            return "\n".join(lines[:i])          # keep only the lines above the footnotes
    return page_text


def load_pdf_text(path: str) -> str:
    reader = PdfReader(path)
    pattern = r"Page \d+ of \d+\s*"
    replacement = ""
    text = "\n".join(remove_footnotes(page.extract_text() or "") for page in reader.pages)
    text = re.sub(pattern, replacement, text)
    text = text.replace("\xad", "-")

    #we have two occurence of this heading [Chapter I] but real chapter starts on the secnod occurence 
    #so we will find all ocurence and then get second occurence 

    chapters = [m.start() for m in re.finditer(r"CHAPTER I\b", text)]

    if len(chapters) >1:
        text = text[chapters[1]:]
    return text


# SECTON_PATTERN = re.compile(r"\n\s*(\d{1,3}(?:A-Z)?)\.\s")
SECTON_PATTERN = re.compile(r"\n\s*\*?(?:\d{1,3}\[\s*)*(?:\d(?=\d{3}\.\s))?(\d{1,3}|\d{2,3}-?[A-Z]{1,2})\.\s")
def chunk_by_section(text:str) -> list[dict]:
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
            #pdf noise 
            continue 
        chunks.append({"section": section, "text": chunk_text})

    return chunks




if __name__ == "__main__":
    text = load_pdf_text("data/raw/ppc.pdf")
    print("=== RAW TEXT SAMPLE ===")
    print(text[:2000])
    # print(text)
    # first!


    chunks = chunk_by_section(text)
    print(f"\nTotal chunks: {len(chunks)}")
    for c in chunks[:5]:
        print(f"\n--- Section {c['section']} ---")
        print(c["text"])
       










    



                 
                   
