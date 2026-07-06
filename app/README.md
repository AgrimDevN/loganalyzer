# LogAnalyzer — AI Log Intelligence

Real-time log ingestion, AI-powered incident detection, and a professional dashboard. Built with Next.js 16, PostgreSQL (pgvector), and a three-agent CrewAI pipeline.

## Architecture

```
my_nextjs_app/          ← this repo (Next.js frontend + API)
agent_service/          ← separate repo (Python FastAPI + CrewAI)
```

The Next.js app handles the UI, user auth, log ingestion, and real-time streaming. When elevated logs arrive it calls the Python agent service, which runs a CrewAI crew (correlator → root-cause investigator → report generator) and writes the incident back to Postgres.

## Stack

- **Next.js 16** — App Router, route groups, server components
- **Drizzle ORM** + **PostgreSQL** (pgvector extension via Docker)
- **Jose** (JWT) + **bcryptjs** — authentication
- **Recharts** — log volume area chart
- **Tailwind v4** — design tokens via CSS custom properties
- **SSE (EventSource)** — live log stream

## Getting started

### 1. Start the database

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET (see .env.example)
```

### 3. Push the schema

```bash
npx drizzle-kit push
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the landing page will ask you to register.

### 5. Seed demo logs (optional)

```bash
node seed/replay_logs.js
```

This replays `seed/demo_logs.jsonl` into the ingest endpoint with realistic timing.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Random secret for JWT signing — **required** |

See `.env.example` for the full template.

## Deploying

The Next.js app can be deployed to Vercel. Set `DATABASE_URL` and `JWT_SECRET` in Vercel environment variables. The database must be reachable from Vercel (use Neon, Supabase, or Railway for a managed pgvector-compatible Postgres).

The agent service is a separate Python process and must be deployed independently (e.g. Railway, Fly.io, or a VPS). Point `AGENT_SERVICE_URL` in your Next.js env at it.
