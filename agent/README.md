# LogAnalyzer — Agent Service

Python FastAPI service that powers the AI analysis pipeline for LogAnalyzer. Exposes two endpoints used by the Next.js app:

- `POST /analyze` — triggers the CrewAI pipeline on a log time window
- `POST /embed` — generates sentence embeddings for vector similarity search
- `GET /health` — liveness probe

## Architecture

```
agent_service/
├── research_crew/          ← CrewAI project (crew + agents + tools)
│   ├── main.py             ← FastAPI app entry point
│   ├── src/research_crew/
│   │   ├── crew.py         ← LogAnalyzerCrew definition
│   │   ├── analyzer.py     ← Fetch logs → run crew → store incident
│   │   ├── config/
│   │   │   ├── agents.yaml ← Agent roles, goals, backstories
│   │   │   └── tasks.yaml  ← Task descriptions and expected outputs
│   │   └── tools/
│   │       └── log_tools.py ← get_past_incidents, semantic_search
│   └── pyproject.toml      ← crewai dependencies
└── pyproject.toml          ← FastAPI + uvicorn + sentence-transformers
```

## Three-agent pipeline

1. **Correlator** — reconstructs the event timeline across all services
2. **Root Cause Investigator** — uses semantic search + past incidents to identify why it failed
3. **Responder** — generates a structured incident report with severity + remediation steps

## Requirements

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (package manager)
- [Ollama](https://ollama.com/) running locally with `llama3.2:1b` pulled
- PostgreSQL with pgvector (shared with the Next.js app)

## Getting started

### 1. Start Ollama and pull the model

```bash
ollama pull llama3.2:1b
```

### 2. Configure environment

```bash
cp research_crew/.env.example research_crew/.env
# Edit research_crew/.env — set DATABASE_URL to point at your Postgres
```

### 3. Install dependencies

```bash
# Outer service (FastAPI + sentence-transformers)
uv sync

# Inner crew (crewAI)
cd research_crew && uv sync
```

### 4. Run the service

```bash
cd research_crew
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The Next.js app calls this service at `http://localhost:8000` by default.

## Environment variables

All secrets live in `research_crew/.env`. See `research_crew/.env.example`.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (same DB as Next.js app) |
| `OLLAMA_BASE_URL` | Ollama API base URL (default: `http://localhost:11434`) |
| `GROQ_API_KEY` | Optional: Groq API key if switching LLM provider |
| `GEMINI_API_KEY` | Optional: Google Gemini API key if switching LLM provider |

## Switching LLM providers

Edit `src/research_crew/crew.py` — the `_get_llm()` function. Currently configured for Ollama (free, local, unlimited). To use Groq:

```python
def _get_llm() -> LLM:
    return LLM(model="groq/llama-3.1-8b-instant")
```
