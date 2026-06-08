# SQL Agent — Frontend

A minimal chat interface for the Text-to-SQL agent. Next.js (App Router) +
TypeScript + Tailwind, talking to the FastAPI backend over `fetch` with SSE
streaming.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

The dev server proxies `/connect` and `/query` to the FastAPI backend (default
`http://localhost:8000`) via rewrites in `next.config.mjs`, so the browser talks
same-origin — no CORS setup needed. Point it elsewhere with:

```bash
BACKEND_URL=http://127.0.0.1:9000 npm run dev
```

## Backend contract

- `POST /connect` → `{ session_id, dialect, schema_summary }` (or `{ error }`)
- `POST /query` (SSE) → emits `status`, `sql`, `result`, `rejected`, `error`,
  and `done` events as the LangGraph runs.

The backend must send `Content-Type: text/event-stream` and flush events as they
occur (don't buffer the whole response).

## Structure

| Path | Role |
| --- | --- |
| `app/page.tsx` | Orchestrates session, messages, streaming, auto-scroll |
| `hooks/useQueryStream.ts` | SSE client (fetch + ReadableStream parser) |
| `lib/api.ts` | `/connect` call + helpers |
| `lib/types.ts` | Shared types |
| `components/Header.tsx` | Slim header + connection pill |
| `components/ConnectModal.tsx` | Connect-database dialog |
| `components/Composer.tsx` | Bottom input (Enter sends, Shift+Enter newline) |
| `components/EmptyState.tsx` | First-run state + example chips |
| `components/SqlBlock.tsx` | Collapsible, copyable SQL |
| `components/ResultTable.tsx` | Result table / scalar headline |
| `components/messages/*` | User / system / agent turn rendering |
