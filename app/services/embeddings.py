import os, time, hashlib
from google import genai
from google.genai import types           # settings objects for Gemini
from supabase import create_client

EMBED_MODEL = "gemini-embedding-001"

EMBED_DIM = 768

gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])

def embed_texts(texts:list[str], task: str="RETRIEVAL_DOCUMENT") -> list[list[float]]:
    for attempt in range(5):
        #try upto five time (free tier sometimes ays 429)

        try:
            res = gemini.models.embed_content(
                model=  EMBED_MODEL,
                contents=[t[:9000] for t in texts],
                #cut very log texts to 9000 chars
                # the full text is still saved in "content", only the search key is shortened

                config=types.EmbedContentConfig(output_dimensionality=EMBED_DIM,
                task_type=task),
            )
            return [e.values for e in res.embeddings]

        except Exception as e:
             wait = 20 * (attempt + 1)                        # wait longer each time: 20s, 40s, 60s...
             print(f"  embed failed ({e}) - waiting {wait}s")
             time.sleep(wait)
    raise RuntimeError("embedding failed 5 times")



def store_chunks(chunks:list[dict], meta:dict, batch_size:int = 20 ):
    # 1) Fingerprint = hash of the TEXT ONLY ("did the content change?")
    for c in chunks:
        c["hash"] = hashlib.sha256(c["text"].encode()).hexdigest()

    # 2) Ask the database which fingerprints of this document it already has
    done = supabase.table("chunks").select("chunk_hash").eq("source_name", meta["source_name"]).execute()
    have = {r["chunk_hash"] for r in done.data}                # a set, so "in" checks are fast
    todo = [c for c in chunks if c["hash"] not in have]        # keep only chunks whose text is not stored yet
    print(f"{len(have)} already stored, {len(todo)} to embed")

    # 3) Embed and insert, one batch at a time. Everything below is INSIDE the loop.
    for i in range(0, len(todo), batch_size):
        # 1. Get the next batch of chunks (e.g., 20 chunks)
        batch = todo[i : i + batch_size]

        # 2. Convert each chunk's text into an embedding vector
        texts = [chunk["text"] for chunk in batch]
        embs = embed_texts(texts)

        # 3. Make sure every text has a corresponding embedding
        assert len(embs) == len(batch), "Got fewer vectors than texts"

        # 4. Prepare database rows by pairing each chunk with its embedding
        rows = [
            {
                **meta,                          # Document metadata
                "ref": chunk["section"],         # Section number for citations
                "content": chunk["text"],        # Text the LLM will read
                "chunk_hash": chunk["hash"],     # Fingerprint of this chunk
                "model_version": EMBED_MODEL,    # Embedding model used
                "embedding": embedding,          # Vector of 768 numbers
            }
            for chunk, embedding in zip(batch, embs)
        ]

        # 5. Insert all rows in one database request
        supabase.table("chunks").insert(rows).execute()

        # 6. Print progress
        stored = min(i + batch_size, len(todo))
        total = len(todo)
        print(f"  {stored}/{total} stored")

        # 7. Wait before the next batch. Free tier = 100 TEXTS per minute (each text in a
        #    batch counts). 20 texts every 15s = 80/min, safely under the limit.
        time.sleep(15)


def delete_stale_chunks(chunks: list[dict], source_name: str, batch_size: int = 50):
    # Run AFTER store_chunks. When the cleaning changes, a section gets a new hash and
    # store_chunks inserts it as a new row. The old row (old text, old hash) is still there,
    # so search would return both. Delete every row of this document whose hash is not
    # in the current chunk list. Inserting first, deleting second = no moment with missing sections.
    current = {hashlib.sha256(c["text"].encode()).hexdigest() for c in chunks}
    rows = supabase.table("chunks").select("chunk_hash").eq("source_name", source_name).limit(5000).execute().data
    stale = sorted({r["chunk_hash"] for r in rows} - current)
    print(f"{len(stale)} stale rows to delete")
    for i in range(0, len(stale), batch_size):
        supabase.table("chunks").delete().eq("source_name", source_name).in_("chunk_hash", stale[i:i + batch_size]).execute()
