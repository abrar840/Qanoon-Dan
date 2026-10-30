# QanoonDaan Web: Handover

This is the complete frontend for QanoonDaan. It runs today against a fake API
(the "mock") that lives in the browser. When the FastAPI backend is ready, one
environment variable switches it to real HTTP calls. Nothing else changes.

Written for a backend developer who will maintain this without AI help. Every
file has a comment at the top saying what it does. Read this document once,
then open `src/api/types.ts` and `src/pages/ChatPage.tsx`; those two files are
the heart of the app.

---

## 1. How to run it

Requirements: Node 20 or newer, npm 10 or newer. Nothing else.

```bash
cd web
npm install                 # once, and after package.json changes
copy .env.example .env.local
npm run dev                 # dev server at http://localhost:5173, hot reload
```

Other commands:

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `npm run typecheck` | TypeScript check only, no output files. Must print nothing.            |
| `npm run build`     | Typecheck + production build into `dist/` (static files, ~75 KB gzip). |
| `npm run preview`   | Serves `dist/` locally so you can test the production build.           |

To open the dev server on your phone: set `host: true` in `vite.config.ts`,
run `npm run dev`, and open the "Network" URL Vite prints on a phone on the
same Wi-Fi.

### Switching from mock to real backend

Edit `.env.local`:

```
VITE_USE_MOCK=false
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Restart `npm run dev` (Vite reads env files at start). That is the whole
switch. `src/api/index.ts` reads `VITE_USE_MOCK` and exports either `mockApi`
or `httpApi`. If the variable is missing the app defaults to the mock so a
fresh clone always works.

All `VITE_*` values are shipped to the browser. The Supabase **anon** key is
designed to be public. Never put the service role key, Groq key or Gemini key
in any `VITE_*` variable.

### Deploying

`npm run build` produces `dist/`. Any static host serves it (Render static
site, Netlify, Vercel, Cloudflare Pages, or FastAPI's `StaticFiles`). Because
the app uses browser routing (`/c/abc`, `/settings`), the host must serve
`index.html` for unknown paths. On Render: add a rewrite rule `/*` to
`/index.html`. If you serve it from FastAPI, mount `dist/` and return
`index.html` as the fallback for any non-API path.

---

## 2. Folder structure

```
web/
  index.html               HTML shell. Sets the theme before React loads (no flash).
  package.json             Exact pinned versions, scripts.
  vite.config.ts           Vite + React plugin. Nothing clever.
  tsconfig.json            Strict TypeScript.
  .env.example             Documented env vars. Copy to .env.local.
  HANDOVER.md              This file.
  BACKEND-CONTRACT.md      What the backend must implement.
  src/
    main.tsx               Entry. Loads CSS, wraps <App> in the providers.
    App.tsx                The route table (which URL shows which page).
    vite-env.d.ts          Types for import.meta.env.
    api/
      types.ts             THE CONTRACT. All request/response types + the Api interface.
      index.ts             Picks mock or http based on VITE_USE_MOCK. Components import from here.
      mock.ts              Fake implementation, data in localStorage, demo scenarios.
      http.ts              Real implementation, fetch() to FastAPI + Supabase Auth.
      supabase.ts          Supabase client (auth only). Used by http.ts only.
    config/
      helplines.ts         Crisis helplines (PLACEHOLDERS, verify every number).
      examples.ts          Example questions + product copy (disclaimer, scope).
    state/                 React contexts = global state. One file each.
      AuthContext.tsx      Who is logged in. useAuth().
      SettingsContext.tsx  Theme, answer length, show sources. useSettings().
      ConversationsContext.tsx  Sidebar list. useConversations().
      ToastContext.tsx     Small status popups. useToast().
    hooks/
      useMediaQuery.ts     "Is this a desktop-width screen?"
    utils/
      clipboard.ts         Copy and share helpers.
      format.ts            Dates, initials, answer-to-plain-text.
    components/
      ui/                  Generic building blocks: Icons, Avatar, Field, ConfirmDialog.
      layout/              AppShell (frame), TopBar, Sidebar (drawer), AuthLayout, RequireAuth.
      chat/                Everything inside the chat screen:
        QuestionBox.tsx    The text box + send button + disclaimer line.
        AnswerCard.tsx     One answer: normal / refused / crisis / loading / error.
        AnswerText.tsx     Paragraphs + clickable [Section 302] chips.
        SourceCard.tsx     One cited section with snippet.
        CrisisHelplines.tsx  Helpline list shown on crisis answers.
        FeedbackButtons.tsx  Thumbs up/down + optional comment.
        EmptyState.tsx     Intro + example questions.
    pages/                 One file per URL.
      ChatPage.tsx         "/" and "/c/:id". The main screen.
      LoginPage.tsx, SignUpPage.tsx, ForgotPasswordPage.tsx, ResetPasswordPage.tsx
      ProfilePage.tsx, SettingsPage.tsx, AboutPage.tsx, NotFoundPage.tsx
    styles/                Plain CSS, loaded once in main.tsx.
      tokens.css           Colours, spacing, radii. Light + dark values. Edit here to re-skin.
      base.css             Reset, focus ring, skip link.
      components.css       Buttons, fields, cards, dialog, toast, avatar, menu.
      layout.css           Top bar, sidebar/drawer, page column, auth layout.
      chat.css             Chat screen specifics.
```

### URL map

| URL                | Page               | Who                     |
| ------------------ | ------------------ | ----------------------- |
| `/`                | ChatPage (new chat)| everyone (guest mode)   |
| `/c/:id`           | ChatPage (saved)   | logged in               |
| `/login`           | LoginPage          | guests                  |
| `/signup`          | SignUpPage         | guests                  |
| `/forgot-password` | ForgotPasswordPage | guests                  |
| `/reset-password`  | ResetPasswordPage  | arrives from email link |
| `/profile`         | ProfilePage        | logged in (RequireAuth) |
| `/settings`        | SettingsPage       | everyone                |
| `/about`           | AboutPage          | everyone                |
| anything else      | NotFoundPage       | everyone                |

---

## 3. How data flows

Rule: **components never talk to a server directly.** They call methods on
`api`, which is typed by the `Api` interface. Nothing in `components/`,
`pages/` or `state/` imports `mock.ts` or `http.ts`.

Example, asking a question:

```
User types, presses Enter
  -> QuestionBox calls onSend(question)
  -> ChatPage.ask() adds a "loading" item to the list
  -> api.ask({ question, conversation_id, answer_length })        (src/api/index.ts)
       |-- VITE_USE_MOCK=true  -> mock.ts: wait ~0.7 s, pick fake sources by keyword
       |-- VITE_USE_MOCK=false -> http.ts: POST {VITE_API_URL}/ask with JSON body
                                  + "Authorization: Bearer <jwt>" if logged in
  <- AskResponse { answer, sources, refused, crisis, disclaimer, conversation_id?, message_id? }
  -> ChatPage marks the item "done" and stores the response
  -> AnswerCard renders it: crisis card / refused card / normal card
  -> If a NEW conversation was created for a logged-in user,
     ChatPage changes the URL to /c/<id> and refreshes the sidebar list.
```

On failure, every implementation throws an `ApiError` (`types.ts`) with a
user-safe `message`, an HTTP `status` and a short `code` like `rate_limited`.
`ChatPage` shows `message` in the red error card with a "Try again" button.

### Global state (contexts)

React "context" is just a value that any component below the provider can
read. There are four, all in `src/state/`, all wrapped around `<App>` in
`main.tsx`. Each exposes one hook:

- `useAuth()` -> `{ user, loading, logIn, logOut, signUp, setUser }`.
  Loads once on start with `api.getMe()`, then listens to
  `api.onAuthStateChange()` for changes from other tabs or the reset link.
- `useSettings()` -> `{ settings, update }`. Always saved in localStorage
  (`qd.settings`), and also sent to the API when logged in. Applying the theme
  means setting `<html data-theme="dark">`; the CSS does the rest.
- `useConversations()` -> `{ conversations, refresh, rename, remove, removeAll }`.
  The sidebar list. Empty for guests.
- `useToast()` -> `{ show(message, kind) }`.

### Guest mode

A guest can ask questions. Their exchanges live only in React state and
vanish on reload. The sidebar shows a "log in to save history" note and the
chat shows a dismissible banner. When a logged-in user asks, the backend saves
the exchange and returns `conversation_id` + `message_id`.

### Mock scenarios (for demos)

Put one of these words in the question:

| Word              | Result                                                              |
| ----------------- | ------------------------------------------------------------------- |
| `refuse`, `divorce` | refused answer (amber), no sources                                |
| `crisis`          | crisis answer (red) with helplines only                             |
| `crisis` + `assault`/`beat`/`theft`... | helplines, then a cited legal answer below       |
| `error`           | fails with "QanoonDaan is busy. Please try again in a minute."      |
| `limit`           | fails with the 429 rate-limit message                               |
| `slow`            | normal answer after 5 seconds (shows the loading state)             |
| anything else     | normal answer with 2-3 sources chosen by keyword (murder, cheque, theft, assault, threat, cheat) |

Mock accounts: `demo@qanoondaan.pk` / `demo1234` has one saved conversation.
Any other email with an 8+ character password logs in (and is created if
new). A password starting with `wrong` fails. Signing up with an email that
contains `confirm` shows the "check your email" screen. All mock data is in
localStorage under keys starting with `qd.mock.`; clear them in DevTools >
Application > Local Storage to reset.

---

## 4. Libraries and why

| Package                 | Version | Why                                                                                       |
| ----------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `react`, `react-dom`    | 18.3.1  | The UI library. v18 is the long-stable line with the most documentation and examples.     |
| `react-router-dom`      | 6.30.6  | URL -> page mapping, `useNavigate`, `useParams`. v6 is the version most tutorials cover.  |
| `@supabase/supabase-js` | 2.118.0 | Only for auth (sign up, log in, reset password, JWT). Your DB is already Supabase.        |
| `vite`                  | 5.4.21  | Dev server + build. Fast, zero-config for React + TS.                                     |
| `@vitejs/plugin-react`  | 4.7.0   | Lets Vite understand JSX and hot-reload React.                                            |
| `typescript`            | 5.6.3   | Types. The `Api` interface is what makes mock/http swappable safely.                      |
| `@types/react*`         | 18.3.x  | Type definitions for React.                                                               |

Deliberately **not** used: no CSS framework (plain CSS with variables is
~600 lines and you can read all of it), no state library (four small
contexts are enough), no icon library (12 inline SVGs in `Icons.tsx`), no
markdown library (answers are plain text with `[Section N]` tags).

### Auth decision: Supabase Auth in the browser

Chosen over "FastAPI does its own auth" because:

1. The database is already Supabase Postgres, so `auth.users` exists and
   row-level security can use `auth.uid()` directly.
2. Password hashing, email confirmation, password-reset emails and session
   refresh come for free. Writing those yourself is a week of work and a
   security risk.
3. FastAPI stays stateless: it only verifies the JWT on each request (one
   dependency function, see BACKEND-CONTRACT.md).

The trade-off: the frontend depends on one third-party SDK (~40 KB gzip), and
your FastAPI needs the project's JWT secret to verify tokens.

---

## 5. How to add a new feature (walkthrough)

Example: **"Export my conversation as a text file"** button on a saved chat.

1. **Contract first.** In `src/api/types.ts`, add to the `Api` interface:
   ```ts
   /** Returns the whole conversation as plain text for download. */
   exportConversation(id: string): Promise<{ filename: string; text: string }>;
   ```
   TypeScript now shows errors in `mock.ts` and `http.ts` because both must
   implement it. Good: that is the compiler reminding you.

2. **Mock.** In `src/api/mock.ts`, add a method that reads the messages from
   localStorage and joins them into a string. Add an `await delay()` so the
   loading state is visible.

3. **HTTP.** In `src/api/http.ts`:
   ```ts
   exportConversation(id) {
     return request(`/conversations/${encodeURIComponent(id)}/export`, { requireAuth: true });
   }
   ```

4. **Document it.** Add the endpoint to `BACKEND-CONTRACT.md` (method, path,
   auth, request, response, errors).

5. **UI.** In `src/pages/ChatPage.tsx` add a button near the top of the
   saved-conversation view. On click:
   ```ts
   const { filename, text } = await api.exportConversation(conversationId);
   const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
   const a = Object.assign(document.createElement('a'), { href: url, download: filename });
   a.click(); URL.revokeObjectURL(url);
   toast.show('Downloaded.', 'success');
   ```
   Wrap it in try/catch and show `errorMessage(err)` in a toast on failure.

6. **Style.** If it needs new CSS, add a class to the relevant file in
   `src/styles/` using the variables from `tokens.css`. Never hard-code a
   colour.

7. **Check.** `npm run typecheck` then click through it in the mock.

The same seven steps apply to any feature: types -> mock -> http -> contract
-> component -> css -> check.

### Where to change common things

- Colours / dark mode values: `src/styles/tokens.css`
- Disclaimer, scope line, example questions: `src/config/examples.ts`
- Helpline numbers: `src/config/helplines.ts` (set `verified: true` once checked)
- Max question length: `QuestionBox.tsx` (`MAX`) and the backend's Pydantic model
- Sidebar breakpoint (drawer vs column): `useMediaQuery.ts` (`DESKTOP_QUERY`) **and** the
  `@media (min-width: 900px)` block in `layout.css`. Keep them equal.
- Mock fake sections / answers: `SECTIONS` and `TOPICS` in `mock.ts`

---

## 6. Extras beyond the brief (and why)

- **Citation chips.** `[Section 302]` in an answer becomes a chip; tapping it
  scrolls to and highlights that source card. Makes "every answer cites its
  source" visible.
- **Try again** button on a failed answer (re-sends the same question in place).
- **Rate-limit message** (429) distinct from the generic "busy" (5xx).
- **Enter to send, Shift+Enter for newline**, auto-growing box, character
  counter that appears near the 1000 limit.
- **Guest banner** (dismissible per session) and a guest note in the sidebar.
- **Reset-password page** (`/reset-password`), required by Supabase's email link.
- **About and safety page** (`/about`) with scope, limits and the helplines.
- **Conversation grouping** in the sidebar by Today / Yesterday / date.
- **Skip link** ("Skip to question box") for keyboard users.
- **Theme applied before first paint** (inline script in `index.html`) so dark
  mode does not flash white.
- **Settings for guests** stored locally; synced to the account once logged in.
- **Avatar remove** as well as upload; initials fallback when there is no photo.

---

## 7. Known limitations and TODOs

**Must do before real users**

- [ ] Verify every helpline number in `src/config/helplines.ts` and set
      `verified: true`. The UI shows "numbers are being verified" until then.
- [ ] Replace the paraphrased snippets in `mock.ts` with nothing: the real
      backend returns the real statute text. The mock text is NOT the law.
- [ ] Build the backend per `BACKEND-CONTRACT.md`, then set
      `VITE_USE_MOCK=false` and test every screen again.
- [ ] In Supabase dashboard: set Site URL and add
      `https://<your-domain>/reset-password` to Redirect URLs.
- [ ] Enable CORS on FastAPI for the web origin.

**Not built, by choice**

- No streaming answers. `/ask` returns the whole answer at once (matches the
  plan). Adding streaming later means a new `askStream` method on the `Api`.
- No Urdu / Roman Urdu. Copy says "English only".
- No offline support / PWA install prompt.
- No automated tests in the repo. The UI was verified with a Playwright
  click-through script run from outside the repo (44 steps, all passing, see
  the session summary). If you want tests in-repo, add Vitest + Testing Library.
- Avatar upload in the mock stores the image as a data URL in localStorage
  (fine for a demo, not for production; the real backend stores to Supabase
  Storage).
- Login with an unknown email in the **mock** silently creates an account so
  demos are easy. The real backend returns "Incorrect email or password".
- `SettingsContext` suppresses one lint rule (`react-hooks/exhaustive-deps`)
  on purpose: it should reload settings only when the user *id* changes, not
  on every profile edit.
- Sources with the same section number in one answer would share a React key
  (`SourceCard key={s.section}`). The backend should de-duplicate sections per
  answer; otherwise switch the key to the array index.

**Nice to have later**

- Search within history.
- "Copy link" sharing (needs public conversation pages, a privacy decision).
- Message-level "report a problem" that files to a support inbox.
- Urdu interface strings (all copy is already centralised in `config/examples.ts`
  and in each page, so extraction into a translations file is mechanical).
