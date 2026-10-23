-- Vector retrieval for the chunks table. Called from app/services/rag.py via supabase.rpc("match_chunks", ...).
-- Lives in the database because the Supabase REST client cannot express the pgvector <=> operator.
-- Run this in the Supabase SQL editor whenever the project is recreated.
--
-- <=> is cosine DISTANCE (0 = identical, 1 = unrelated). Smaller is closer.
-- Day 13 numbers: correct sections land at 0.25-0.41, off-topic questions at 0.44+.
--
-- pgvector is installed in the public schema on this project, so the type is written as
-- public.vector and the search path is pinned. Without that, the SQL editor fails with
-- "type vector does not exist".

create or replace function match_chunks(
  query_embedding public.vector(768),
  match_count int,
  filter_source text default null
)
returns table (
  ref text,
  source_name text,
  content text,
  distance float
)
language sql stable
set search_path = public
as $$
  select ref, source_name, content, embedding <=> query_embedding as distance
  from chunks
  where filter_source is null or source_name = filter_source
  order by embedding <=> query_embedding
  limit match_count;
$$;
