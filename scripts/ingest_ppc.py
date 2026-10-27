from dotenv import load_dotenv
load_dotenv()          # load keys FIRST: embeddings.py reads them the moment it is imported

from app.services.ingestion import load_pdf_text, chunk_by_section   # the "tools": read PDF, cut into sections
from app.services.embeddings import store_chunks, delete_stale_chunks  # embed + insert, then remove outdated rows

chunks = chunk_by_section(load_pdf_text("data/raw/ppc.pdf"))   # PDF -> clean text -> list of {"section", "text"}
print(f"{len(chunks)} chunks from the PDF")

store_chunks(chunks, {                                         # embed and save, with these details on every row:
    "doc_type": "law", "source_name": "Pakistan Penal Code",
    "year": 1860, "jurisdiction": "Pakistan", "version": "as in data/raw/ppc.pdf",
})

delete_stale_chunks(chunks, "Pakistan Penal Code")             # remove rows whose text was replaced by a cleaner version
