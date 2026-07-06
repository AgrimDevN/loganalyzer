# LogAnalyzer

AI-powered log intelligence platform. Ingests production logs in real time, runs a three-agent CrewAI pipeline to detect incidents and identify root causes, and surfaces everything in a professional dashboard.

```
loganalyzer/
├── app/      ← Next.js 16 frontend + API  (TypeScript)
├── agent/    ← FastAPI + CrewAI pipeline  (Python)
└── docker-compose.yml  ← Postgres + pgvector
```

## How it works

```
Your service → POST /api/logs/ingest
                    │
                    ├─ stores log in Postgres
                    ├─ generates vector embedding (via agent /embed)
                    └─ if critical/error: debounced call to agent /analyze
                                                │
                                    CrewAI 3-agent pipeline
                                    1. Correlator       — builds timeline
                                    2. Root Cause       — explains why
                                    3. Responder        — writes report
                                                │
                                    incident written back to Postgres
                                                │
                              Next.js dashboard reads & displays it
```

## Quick start

### 1. Start the database

```bash
docker compose up -d
```

### 2. Configure the Next.js app

```bash
cd app
cp .env.example .env
# set JWT_SECRET:  openssl rand -hex 32
npm install
npx drizzle-kit push
npm run dev        # → http://localhost:3000
```

### 3. Configure the agent service

```bash
cd agent/research_crew
cp .env.example .env
# set DATABASE_URL to match app/.env
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Make sure [Ollama](https://ollama.com) is running with `llama3.2:1b` pulled:

```bash
ollama pull llama3.2:1b
```

### 4. Send a test log

```bash
curl -X POST http://localhost:3000/api/logs/ingest \
  -H "Content-Type: application/json" \
  -d '{"serviceName":"api","severity":"critical","message":"DB pool exhausted","timestamp":"2026-07-06T12:00:00Z"}'
```

### 5. Replay demo logs (optional)

```bash
cd app
node seed/replay_logs.js
```

## Environment variables

### `app/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Random secret for JWT signing — run `openssl rand -hex 32` |
| `AGENT_SERVICE_URL` | Agent service base URL (default: `http://localhost:8000`) |

### `agent/research_crew/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Same Postgres connection string as `app/.env` |
| `OLLAMA_BASE_URL` | Ollama API URL (default: `http://localhost:11434`) |

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, Tailwind v4, Recharts |
| Auth | Jose (JWT) + bcryptjs |
| Database | PostgreSQL + pgvector (Drizzle ORM) |
| Agent pipeline | CrewAI + Ollama (llama3.2:1b) |
| Embeddings | sentence-transformers all-MiniLM-L12-v2 |
| Real-time | Server-Sent Events (SSE) |
