-- Every /ask exchange, stored so we can track how the model performs over time
-- (refusal rate, crisis rate, latency, which sections are retrieved) and find bad answers to fix.
-- Run this in the Supabase SQL editor whenever the project is recreated.
--
-- Privacy (see the Privacy Policy): no name, account or IP address is stored here, and rows are
-- deleted automatically after 15 days by the scheduled job at the bottom of this file.

create table if not exists public.ask_logs (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  question        text not null,
  answer          text not null,
  sources         text[] not null default '{}',   -- retrieved section numbers, closest first
  top_distance    double precision,               -- distance of the best match; null when nothing was retrieved
  refused         boolean not null default false,
  crisis          boolean not null default false,
  crisis_topic    text,                           -- e.g. 'violence_at_home'
  accusation      boolean not null default false, -- the false-complaint warning was added
  latency_ms      integer,                        -- time to answer, end to end
  model           text,                           -- e.g. 'openai/gpt-oss-120b'
  prompt_version  text                            -- change it whenever SYSTEM changes, to compare before and after
);

-- the daily cleanup and "last 7 days" style queries filter by time
create index if not exists ask_logs_created_at_idx on public.ask_logs (created_at);

-- RLS on with no policies: the public (anon) key can neither read nor write this table.
-- Only the backend, which uses the secret key, can insert and read.
alter table public.ask_logs enable row level security;

-- 15-day retention, as promised in the Privacy Policy: every day at 03:00 UTC, delete older rows.
-- If "create extension" fails, enable pg_cron in Database -> Extensions, then run the two lines again.
create extension if not exists pg_cron;

select cron.schedule(
  'delete-old-ask-logs',
  '0 3 * * *',
  $$ delete from public.ask_logs where created_at < now() - interval '15 days' $$
);
