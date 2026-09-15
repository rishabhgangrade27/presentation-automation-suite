# Frontend

Next.js App Router UI for the Presenton Automation Suite. See the
[repository root README](../README.md) for architecture, full setup, and what has actually
been verified — this file just covers running this piece on its own.

```bash
npm install
cp .env.local.example .env.local   # set N8N_BASE_URL (or PRESENTON_BASE_URL, see below)
npm run dev
```

Open `http://localhost:3000`.

## Two backend modes

`app/api/generate/route.ts` and `app/api/status/[id]/route.ts` support two modes, selected by
which env var is set (`PRESENTON_BASE_URL` takes priority if both are present):

- **`N8N_BASE_URL`** (the canonical, verified path) — calls the n8n workflow, which calls
  Presenton. This is what the assessment asks for and what `npm run dev` is configured for by
  default in `.env.local.example`.
- **`PRESENTON_BASE_URL`** — calls Presenton directly via `lib/presentonDirect.ts`, bypassing
  n8n entirely. This exists because the frontend was built and validated in isolation while
  n8n was being fixed separately in this project's timeline; it's kept as a useful way to test
  the frontend/Presenton contract without n8n in the loop, not as the intended production path.
