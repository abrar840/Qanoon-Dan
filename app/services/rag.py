from app.services.embeddings import embed_texts, supabase
from app.schemas import RetrievedChunk




def retrieve(query:str, k: int=5, source: str | None=None) ->list[RetrievedChunk]:
    q_ambed = embed_texts([query], task="RETRIEVAL_QUERY")[0]
    
    res = supabase.rpc("match_chunks", {
        
        "query_embedding": q_ambed,
        "match_count":k,
        "filter_source":source,
        
        
    }).execute()
    return [RetrievedChunk.model_validate(r) for r in res.data]
   #list of refrence , source_name, content, distance