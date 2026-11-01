# QanoonDaan Web: Handover

The frontend for QanoonDaan. It talks to the FastAPI backend at
`VITE_API_URL`, so start the backend before the UI.

v1 is guest-only: anyone can ask a question, nothing is saved, and there is no
login. Accounts, history and feedback will be added one at a time (see
section 5 and `BACKEND-CONTRACT.md`).

Every file has a comment at the top saying what it does. Read this document
once, then open `src/api/types.ts` and `src/pages/ChatPage.tsx`; those two
files are the heart of the app.

---

## 1. How to run it

Requirements: Node 20 or newer, npm 10 or newer.

```bash
# 1. backend, from the repo root with the venv active
uvicorn app.main:app --reload          # http://127.0.0.1:8000

# 2. frontend
cd web
npm install                 # once, and after package.json changes
copy .env.example .env.local
npm run dev                 # http://localhost:5173, hot reload
```

Other commands:

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run typecheck` | TypeScript check only, no output files. Must print nothing.  |
| `npm run build`     | Typecheck + production build into `dist/` (static files).    |
| `npm run preview`   | Serves `dist/` locally so you can test the production build. |

To open the dev server on your phone: set `host: true` in `vite.config.ts`,
run `npm run dev`, and open the "Network" URL Vite prints on a phone on the
same Wi-Fi.

### Pointing the UI at the backend

`.env.local` has one line:

```
VITE_API_URL=http://127.0.0.1:8000
```

Restart `npm run dev` after changing it (Vite reads env files at start).
`src/api/http.ts` reads it into `BASE_URL` and adds the path, e.g. `/ask`.

All `VITE_*` values are shipped to the browser. Never put the Groq key, Gemini
key or Supabase service key in any `VITE_*` variable.

The backend must allow the UI's origin with CORS (`app/main.py`), otherwise
the browser blocks every reply and the UI shows "Cannot reach the server".

### Deploying

`npm run build` produces `dist/`. Any static host serves it (Vercel, Netlify,
Render static site). Because the app uses browser routing (`/settings`,
`/about`), the host must serve `index.html` for unknown paths. Set
`VITE_API_URL` to the deployed backend URL in the host's environment settings.

---

## 2. Folder structure

```
web/
  index.html               HTML shell. Sets the theme before React loads (no flash).
  package.json             Exact pinned versions, scripts.
  vite.config.ts           Vite + React plugin.
  tsconfig.json            Strict TypeScript.
  .env.example             Documented env vars. Copy to .env.local.
  HANDOVER.md              This file.
  BACKEND-CONTRACT.md      Every endpoint the UI uses now (v1) or will use (v2).
  src/
    main.tsx               Entry. Loads CSS, wraps <App> in the providers.
    App.tsx                The route table (which URL shows which page).
    vite-env.d.ts          Types for import.meta.env.
    api/
      types.ts             THE CONTRACT. Request/response types + the Api interface.
      index.ts             Exports `api`. Components import from here.
      http.ts              fetch() calls to FastAPI: ask() and health().
    config/
      examples.ts          Example questions + product copy (disclaimer, scope).
    state/                 React contexts = global state.
      SettingsContext.tsx  Theme and show-sources. useSettings().
      ToastContext.tsx     Small status popups. useToast().
    hooks/
      useMediaQuery.ts     "Is this a desktop-width screen?"
    utils/
      clipboard.ts         Copy and share helpers.
      format.ts            Answer to plain text (for Copy / Share).
    components/
      ui/Icons.tsx         Small inline SVG icons.
      layout/              AppShell (frame), TopBar, Sidebar (drawer on mobile).
      chat/                Everything inside the chat screen:
        QuestionBox.tsx    The text box + send button + disclaimer line.
        AnswerCard.tsx     One answer: normal / refused / crisis / loading / error.
        AnswerText.tsx     Paragraphs + clickable [Section 302] chips.
        SourceCard.tsx     One cited section with snippet.
        EmptyState.tsx     Intro + example questions.
    pages/                 One file per URL.
      ChatPage.tsx         "/". The main screen.
      SettingsPage.tsx, AboutPage.tsx, NotFoundPage.tsx
    styles/                Plain CSS, loaded once in main.tsx.
      tokens.css           Colours, spacing, radii. Light + dark values. Edit here to re-skin.
      base.css             Reset, focus ring, skip link.
      components.css       Buttons, cards, toast.
      layout.css           Top bar, sidebar/drawer, page column.
      chat.css             Chat screen specifics.
```

Some CSS classes (auth layout, avatar, menu, dialog, conversation list) are
left over from the removed v2 screens. They are harmless and will be used again.

### URL map

| URL           | Page         |
| ------------- | ------------ |
| `/`           | ChatPage     |
| `/settings`   | SettingsPage |
| `/about`      | AboutPage    |
| anything else | NotFoundPage |

---

## 3. How data flows

Rule: **components never talk to a server directly.** They call methods on
`api`, which is typed by the `Api` interface. Nothing in `components/`,
`pages/` or `state/` imports `http.ts`.

Asking a question:

```
User types, presses Enter
  -> QuestionBox calls onSend(question)
  -> ChatPage.ask() adds a "loading" item to the list
  -> api.ask({ question })                       (src/api/index.ts)
       -> http.ts: POST {VITE_API_URL}/ask with JSON body
  <- AskResponse { answer, sources, refused, crisis, disclaimer }
  -> ChatPage marks the item "done" and stores the response
  -> AnswerCard renders it: crisis card / refused card / normal card
```

On failure, `http.ts` throws an `ApiError` (`types.ts`) with a user-safe
`message`, an HTTP `status` and a short `code` like `rate_limited`.
`AnswerCard` shows `message` in the red error card with a "Try again" button.

Questions live only in React state in `ChatPage`, so they vanish on reload.
"New chat" in the sidebar clears them.

### Global state (contexts)

React "context" is a value any component below the provider can read. Both
are in `src/state/` and wrapped around `<App>` in `main.tsx`:

- `useSettings()` -> `{ settings, update }`. Saved in localStorage
  (`qd.settings`). Applying the theme means setting `<html data-theme="dark">`;
  the CSS does the rest.
- `useToast()` -> `{ show(message, kind) }`.

### Helplines come only from the backend

The frontend has **no helpline numbers of its own**. On a crisis answer the
backend puts its verified numbers at the top of `answer` as lines like
`- Name: number (scope)`, and `AnswerText` shows them (the CSS keeps the line
breaks). Only numbers the project owner has verified may ever be shown.
Later the backend may send a structured helplines list; when it does, add the
field to `AskResponse` in `types.ts` and draw it in `AnswerCard.tsx`.

### Questions to check the three answer looks

| Question                              | Result                                   |
| ------------------------------------- | ---------------------------------------- |
| What is the punishment for murder?    | normal answer with cited sections        |
| How do I get a divorce?               | refused answer (amber), no sources       |
| My husband beats me, what can I do?   | crisis answer (red), helplines first     |

---

## 4. Libraries and why

| Package                | Version | Why                                                                                      |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `react`, `react-dom`   | 18.3.1  | The UI library. v18 is the long-stable line with the most documentation and examples.    |
| `react-router-dom`     | 6.30.6  | URL -> page mapping. v6 is the version most tutorials cover.                             |
| `vite`                 | 5.4.21  | Dev server + build. Fast, zero-config for React + TS.                                    |
| `@vitejs/plugin-react` | 4.7.0   | Lets Vite understand JSX and hot-reload React.                                           |
| `typescript`           | 5.6.3   | Types. The `Api` interface checks every server call at compile time.                     |
| `@types/react*`        | 18.3.x  | Type definitions for React.                                                              |

Deliberately **not** used: no CSS framework (plain CSS with variables you can
read), no state library (two small contexts are enough), no icon library
(inline SVGs in `Icons.tsx`), no markdown library (answers are plain text with
`[Section N]` tags).

---

## 5. How to add a feature (walkthrough)

Example: **thumbs up / down feedback** (`POST /feedback`, spec in
`BACKEND-CONTRACT.md`). The same steps work for any endpoint.

1. **Backend first.** Build the endpoint and try it in http://127.0.0.1:8000/docs.

2. **Contract.** In `src/api/types.ts`, add the types and one line to `Api`:
   ```ts
   export interface FeedbackInput { rating: 'up' | 'down'; question: string; answer: string; }

   // inside interface Api:
   sendFeedback(input: FeedbackInput): Promise<{ id: string }>;
   ```
   TypeScript now shows an error in `http.ts` because it must implement it.
   Good: that is the compiler reminding you.

3. **HTTP.** In `src/api/http.ts`, inside `httpApi`:
   ```ts
   sendFeedback(input) {
     return request<{ id: string }>('/feedback', { method: 'POST', body: input });
   },
   ```

4. **UI.** Add the buttons (e.g. in `AnswerCard.tsx`) and call
   `api.sendFeedback(...)` inside try/catch; show `errorMessage(err)` with
   `useToast()` on failure.

5. **Style.** New CSS goes in the relevant file in `src/styles/`, using the
   variables from `tokens.css`. Never hard-code a colour.

6. **Check.** `npm run typecheck`, then click through it with the backend running.

The code removed for v1 (login, sign up, profile, history, feedback buttons,
Supabase client) is still in git history, e.g. commit `b0936a6`. Use
`git show b0936a6:web/src/pages/LoginPage.tsx` to see a file and copy what you need back.

### Where to change common things

- Colours / dark mode values: `src/styles/tokens.css`
- Disclaimer, scope line, example questions: `src/config/examples.ts`
- Max question length: `QuestionBox.tsx` (`MAX`) and `AskRequest` in `app/schemas.py`
- Sidebar breakpoint (drawer vs column): `useMediaQuery.ts` (`DESKTOP_QUERY`) **and** the
  `@media (min-width: 900px)` block in `layout.css`. Keep them equal.

---

## 6. Extras beyond the brief (and why)

- **Citation chips.** `[Section 302]` in an answer becomes a chip; tapping it
  scrolls to and highlights that source card.
- **Try again** button on a failed answer (re-sends the same question in place).
- **Rate-limit message** (429) distinct from the generic "busy" (5xx).
- **Enter to send, Shift+Enter for newline**, auto-growing box, character counter.
- **About and safety page** (`/about`) with scope and limits.
- **Skip link** ("Skip to question box") for keyboard users.
- **Theme applied before first paint** (inline script in `index.html`) so dark
  mode does not flash white.

---

## 7. Known limitations and TODOs

**Must do before real users**

- [ ] `QuestionBox` allows 1000 characters; the backend allows 500.
- [ ] Enable CORS on FastAPI for the web origin.

**Not built, by choice**

- No accounts, history or feedback in v1 (see section 5 to add them).
- No streaming answers. `/ask` returns the whole answer at once.
- No Urdu / Roman Urdu. Copy says "English only".
- No automated tests in the repo. If you want them, add Vitest + Testing Library.
- Sources with the same section number in one answer would share a React key
  (`SourceCard key={s.section}`). The backend should de-duplicate sections per
  answer; otherwise switch the key to the array index.
