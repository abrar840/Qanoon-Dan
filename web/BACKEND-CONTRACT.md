# QanoonDaan Backend Contract

This is what the frontend (`web/src/api/http.ts`) expects from the FastAPI
backend. Build to this and the UI works with `VITE_USE_MOCK=false` and no
frontend changes. The TypeScript types in `web/src/api/types.ts` are the
source of truth for field names; this document explains them.

Conventions used throughout:

- JSON everywhere, `snake_case` field names (Pydantic default).
- Timestamps are ISO 8601 strings in UTC, e.g. `"2026-10-22T07:59:27.984Z"`.
- IDs are UUID strings.
- Errors use FastAPI's default shape: `{"detail": "human readable message"}`.
  The frontend shows `detail` to the user when it is a string, so write it
  for a person, not a developer. For 422 Pydantic returns a list; the UI
  shows the first `msg`.
- Status codes the UI reacts to: `401` (send to login), `404`, `409`,
  `422`, `429` ("too many questions"), `5xx` ("busy, try again in a minute"),
  network failure ("cannot reach the server").

---

## Which endpoints are needed when

| Phase | Endpoints                                                                  |
| ----- | -------------------------------------------------------------------------- |
| **v1** (product works, guests only) | `GET /health`, `POST /ask`                            |
| **v2** (accounts)                   | everything else below, plus Supabase Auth config      |

With v1 only, the UI still runs: login pages exist but logging in needs
Supabase; history, profile and settings need the v2 endpoints. Guest chat is
fully functional with v1.

---

## Authentication

**Decision: Supabase Auth in the browser, JWT verified by FastAPI.**

Flow:

1. The browser calls Supabase directly (via `@supabase/supabase-js`) for
   sign up, log in, log out, forgot password, reset password. No FastAPI
   endpoint is involved in those.
2. After login the browser holds a session with an `access_token` (JWT).
3. Every request to FastAPI includes `Authorization: Bearer <access_token>`
   when a session exists. Guests send no header.
4. FastAPI verifies the JWT and reads `sub` (the user id, equals
   `auth.users.id` and `profiles.id`).

### FastAPI side (sketch)

```python
# app/auth.py
import os
import jwt  # pip install PyJWT
from fastapi import Depends, HTTPException, Request

JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]   # Supabase -> Project Settings -> API -> JWT Secret

def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Please log in to continue.")

def optional_user(request: Request) -> str | None:
    """Returns the user id or None. Use on /ask and /feedback."""
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    return _decode(header[7:])["sub"]

def current_user(request: Request) -> str:
    """Raises 401 when not logged in. Use on everything under /me and /conversations."""
    user_id = optional_user(request)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    return user_id
```

Note: Supabase is moving new projects to asymmetric JWT signing keys (ES256
/ RS256 with a JWKS URL). If your project uses those, verify with the JWKS
URL `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` instead of
the shared secret. Check Project Settings -> API -> JWT Keys to see which
one applies.

### Supabase dashboard settings needed

- Authentication -> URL Configuration -> **Site URL**: your web origin.
- **Redirect URLs**: add `https://<web-origin>/reset-password` and
  `http://localhost:5173/reset-password`.
- Authentication -> Providers -> Email: decide whether **Confirm email** is
  on. The UI handles both (shows "Check your email" when on).
- The browser passes `options.data.name` on sign up. The trigger in the SQL
  below copies it into `profiles.name`.

### CORS

The web app is served from a different origin than FastAPI. Add:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://<web-origin>"],
    allow_methods=["*"], allow_headers=["*"])
```

---

## v1 endpoints

### `GET /health`

Auth: none. Already exists.

Response `200`: `{"status": "ok"}`

### `POST /ask`

Auth: **optional**. Guests get an answer; logged-in users also get the
exchange saved.

Request:

```json
{
  "question": "What is the punishment for murder?",
  "conversation_id": null,
  "answer_length": "normal"
}
```

| Field             | Type                                  | Notes                                                                                             |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `question`        | string, 3-1000 chars, **required**    | Pydantic validates. Return 422 outside the range.                                                 |
| `conversation_id` | string or null, optional (v2)         | Continue this conversation. Must belong to the caller, else 404. Ignored for guests.              |
| `answer_length`   | `"short"` / `"normal"` / `"detailed"`, optional (v2) | Hint for the prompt. May be ignored in v1. Default `"normal"`.                     |

v1 may declare only `question`; Pydantic ignores extra fields by default, so
the frontend sending the other two is harmless.

Response `200`:

```json
{
  "answer": "Intentional murder is called qatl-i-amd ... [Section 302] ...",
  "sources": [
    {
      "section": "302",
      "law": "Pakistan Penal Code, 1860",
      "distance": 0.17,
      "snippet": "Punishment of qatl-i-amd: whoever commits qatl-i-amd shall ..."
    }
  ],
  "refused": false,
  "crisis": false,
  "disclaimer": "Legal information, not legal advice. Consult a licensed lawyer.",
  "conversation_id": "9b2c...",
  "message_id": "e41a..."
}
```

| Field             | Type           | Notes                                                                                                   |
| ----------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `answer`          | string         | Plain text. Blank lines separate paragraphs. Cite as `[Section 302]`; the UI turns these into chips.    |
| `sources`         | list of Source | Empty when `refused` is true, or when a crisis has no legal answer. Avoid duplicate `section` values.   |
| `refused`         | bool           | Day-15 refusal gate.                                                                                    |
| `crisis`          | bool           | Day-15 crisis router. When true the UI shows helplines **above** `answer`, so `answer` may start with the helpline text and continue with the legal answer (or be helpline text only). |
| `disclaimer`      | string         | Shown under every answer.                                                                               |
| `conversation_id` | string or null (v2) | Set when the caller is logged in. New conversation created if the request had none. Null for guests. |
| `message_id`      | string or null (v2) | The saved `messages.id`. Used by `POST /feedback`. Null for guests.                               |

**The `snippet` change.** The day-14 plan already includes `snippet: str` in
the `Source` model (`c["content"][:300]`). The UI needs it: each source card
shows the snippet. Keep it in `schemas.py` when you build the endpoint. 300
characters is right; the UI clamps to three lines and offers "Read more".

Errors: `422` bad input; `429` rate limited (slowapi, ~10/min; detail text
is shown to the user, e.g. "Too many questions in a short time. Please wait
a minute."); `502`/`503` with detail `"QanoonDaan is busy. Please try again
in a minute."` when the LLM call fails (day-17 step 2).

Server logic for logged-in users (v2):

1. Produce the answer as in v1.
2. If `conversation_id` given: load it, check `user_id` matches (else 404).
   Otherwise insert a conversation with `title = first 60 chars of question`.
3. Insert one `messages` row with question, answer, sources (JSONB),
   refused, crisis.
4. Update `conversations.updated_at = now()`.
5. Return the ids.

---

## v2 endpoints

All routes below require `Authorization: Bearer <jwt>` unless marked
otherwise. Return `401` with `{"detail": "Please log in to continue."}`
when the token is missing or invalid.

### Profile

#### `GET /me`

Response `200`:

```json
{
  "id": "uuid",
  "email": "atif@example.com",
  "name": "Atif",
  "avatar_url": null,
  "created_at": "2026-10-01T09:00:00Z"
}
```

Read from `profiles` joined with `auth.users.email`. If the profile row is
missing (trigger not installed yet) return `404`; the UI then falls back to
the JWT's data.

#### `PATCH /me`

Request (all optional): `{"name": "New name", "avatar_url": null}`

- `name`: 1-80 chars after trim, else 422 `"Name cannot be empty."`
- `avatar_url`: string URL or `null` to remove the photo.

Response `200`: the updated profile (same shape as `GET /me`).

#### `POST /me/avatar`

Request: `multipart/form-data` with one field `file` (image/*, max 1 MB).

Server: upload to Supabase Storage bucket `avatars` at
`{user_id}/{uuid}.{ext}` using the **service role key** (server side only),
make it public, and return the public URL. Do not update `profiles` here;
the UI calls `PATCH /me` with the URL right after.

Response `200`: `{"avatar_url": "https://.../avatars/uuid/....png"}`

Errors: `422` not an image or too large.

#### `DELETE /me`

Deletes the account: remove the auth user via the Admin API
(`supabase.auth.admin.delete_user(user_id)` with the service role key).
Foreign keys with `ON DELETE CASCADE` below remove profiles, conversations,
messages, settings and feedback. Also delete the user's folder in the
`avatars` bucket.

Response `204`, no body. The browser then signs out locally.

### Settings

#### `GET /me/settings`

Response `200`:

```json
{"theme": "system", "answer_length": "normal", "show_sources": true}
```

If no row exists, return the defaults above (or insert them).

#### `PATCH /me/settings`

Request: any subset of the three fields. Validate enums:
`theme` in `light|dark|system`, `answer_length` in `short|normal|detailed`,
`show_sources` bool. Upsert.

Response `200`: the full settings object.

### Conversations

#### `GET /conversations`

Response `200`: list ordered by `updated_at` **descending**.

```json
[
  {"id": "uuid", "title": "What is the punishment ...", "created_at": "...", "updated_at": "..."}
]
```

No pagination for now (the UI renders the whole list). Add `?limit=` later
if a user passes a few hundred conversations.

#### `GET /conversations/{id}`

Response `200`: the conversation plus its messages ordered by `created_at`
**ascending**.

```json
{
  "id": "uuid",
  "title": "...",
  "created_at": "...",
  "updated_at": "...",
  "messages": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "question": "...",
      "answer": "...",
      "sources": [{"section": "302", "law": "...", "distance": 0.17, "snippet": "..."}],
      "refused": false,
      "crisis": false,
      "feedback": "up",
      "created_at": "..."
    }
  ]
}
```

`feedback` is `"up"`, `"down"` or `null`.

Errors: `404` `"Conversation not found."` when missing **or** owned by
someone else (do not reveal which).

#### `PATCH /conversations/{id}`

Request: `{"title": "New title"}` (1-100 chars after trim, else 422).

Response `200`: the conversation object (no messages).

#### `DELETE /conversations/{id}`

Response `204`. Messages cascade. `404` if not found / not owned.

#### `DELETE /conversations`

"Delete my data" in Settings. Deletes every conversation (and so every
message) of the caller. Response `204`.

### Feedback

#### `POST /feedback`

Auth: **optional** (guests can rate too).

Request:

```json
{
  "message_id": "uuid-or-null",
  "rating": "down",
  "comment": "The section quoted does not match my question",
  "question": "...",
  "answer": "..."
}
```

- `rating`: `"up"` or `"down"`, required.
- `comment`: optional, max 500 chars.
- `question`, `answer`: required copies of the text, so guest feedback is
  useful without a message row and so you keep a record even if the message
  is later deleted.
- `message_id`: when present and the message belongs to the caller, also set
  `messages.feedback = rating` so history shows it.

Response `201`: `{"id": "uuid"}`

---

## Database: suggested Supabase tables

Run this in the Supabase SQL editor **after reading it**. It assumes your
existing PPC embeddings table is separate and untouched.

```sql
-- ============================================================
-- 1. profiles: one row per auth user. Created by trigger on sign up.
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Copy name from the sign-up metadata the frontend sends (options.data.name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. settings: one row per user.
-- ============================================================
create table if not exists public.settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  theme         text not null default 'system'
                  check (theme in ('light', 'dark', 'system')),
  answer_length text not null default 'normal'
                  check (answer_length in ('short', 'normal', 'detailed')),
  show_sources  boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- 3. conversations
-- ============================================================
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

-- ============================================================
-- 4. messages: ONE ROW PER QUESTION/ANSWER PAIR (not per role).
--    /ask is always one question -> one answer, so this is simpler
--    than a role column and matches the API response 1:1.
-- ============================================================
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  question         text not null,
  answer           text not null,
  sources          jsonb not null default '[]'::jsonb,   -- [{section, law, distance, snippet}]
  refused          boolean not null default false,
  crisis           boolean not null default false,
  feedback         text check (feedback in ('up', 'down')),  -- null = not rated
  created_at       timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ============================================================
-- 5. feedback: full record of every rating, including guests.
-- ============================================================
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,  -- null for guests
  message_id  uuid references public.messages(id) on delete set null,
  rating      text not null check (rating in ('up', 'down')),
  comment     text check (char_length(comment) <= 500),
  question    text not null,
  answer      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

-- ============================================================
-- 6. Row-level security
-- ============================================================
-- IMPORTANT CHOICE. FastAPI talks to the database with the SERVICE ROLE key,
-- which bypasses RLS. So in this design FastAPI is responsible for checking
-- `user_id = current user` on every query (the contract above says where).
--
-- RLS is still turned on with owner-only policies, for two reasons:
--   a) if you ever let the browser read these tables directly with the anon
--      key + user JWT, the data is already protected;
--   b) it blocks accidental exposure through the auto-generated REST API.
alter table public.profiles      enable row level security;
alter table public.settings      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.feedback      enable row level security;

create policy "profiles: owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings: owner" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "conversations: owner" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages: owner via conversation" on public.messages
  for all using (
    exists (select 1 from public.conversations c
            where c.id = messages.conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.conversations c
            where c.id = messages.conversation_id and c.user_id = auth.uid())
  );

-- Feedback: users may insert their own; nobody reads it from the client.
create policy "feedback: insert own" on public.feedback
  for insert with check (auth.uid() = user_id or user_id is null);

-- ============================================================
-- 7. Storage bucket for avatars (public read, server-side write)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
-- Uploads happen from FastAPI with the service role key, so no storage
-- policies are needed for writes. Public read is given by `public = true`.
```

### Pydantic models to add (sketch)

```python
from typing import Literal, Optional
from pydantic import BaseModel, Field

AnswerLength = Literal["short", "normal", "detailed"]
Theme = Literal["light", "dark", "system"]
Rating = Literal["up", "down"]

class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)
    conversation_id: Optional[str] = None
    answer_length: AnswerLength = "normal"

class Source(BaseModel):
    section: str
    law: str
    distance: float
    snippet: str

class AskResponse(BaseModel):
    answer: str
    sources: list[Source]
    refused: bool = False
    crisis: bool = False
    disclaimer: str = "Legal information, not legal advice. Consult a licensed lawyer."
    conversation_id: Optional[str] = None
    message_id: Optional[str] = None

class Profile(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str]
    created_at: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    avatar_url: Optional[str] = None

class Settings(BaseModel):
    theme: Theme = "system"
    answer_length: AnswerLength = "normal"
    show_sources: bool = True

class SettingsUpdate(BaseModel):
    theme: Optional[Theme] = None
    answer_length: Optional[AnswerLength] = None
    show_sources: Optional[bool] = None

class Conversation(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

class ConversationRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)

class Message(BaseModel):
    id: str
    conversation_id: str
    question: str
    answer: str
    sources: list[Source]
    refused: bool
    crisis: bool
    feedback: Optional[Rating]
    created_at: str

class ConversationDetail(Conversation):
    messages: list[Message]

class FeedbackIn(BaseModel):
    message_id: Optional[str] = None
    rating: Rating
    comment: Optional[str] = Field(None, max_length=500)
    question: str
    answer: str
```

Note on `PATCH /me` with `avatar_url: null`: Pydantic v2 cannot tell
"field omitted" from "field set to null" by default. Use
`patch.model_dump(exclude_unset=True)` and only update keys that are present.

---

## Build order checklist

1. [ ] v1: `POST /ask` with `snippet`, rate limit, friendly busy error (days 14-17).
2. [ ] Run the SQL above in Supabase. Confirm the trigger by signing up a test user.
3. [ ] `app/auth.py` with `optional_user` / `current_user`. Add `SUPABASE_JWT_SECRET` to `.env` and Render.
4. [ ] CORS middleware.
5. [ ] `GET /me`, `PATCH /me`, `GET/PATCH /me/settings`.
6. [ ] Conversations: list, get, rename, delete, delete all.
7. [ ] Extend `/ask` to save for logged-in users and return the ids.
8. [ ] `POST /feedback`.
9. [ ] `POST /me/avatar` (Storage), `DELETE /me` (Admin API).
10. [ ] Set `VITE_USE_MOCK=false` in the web app and click through every screen.
