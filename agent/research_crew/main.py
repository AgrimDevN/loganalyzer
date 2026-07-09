import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import litellm
import httpx
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

# Groq doesn't support cache_breakpoint (an Anthropic prompt-caching field
# that CrewAI 1.15+ injects into system messages). Drop it silently.
litellm.drop_params = True

from research_crew.analyzer import run_analysis

app = FastAPI()

HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L12-v2"


class AnalyzeRequest(BaseModel):
    startTime: str
    endTime: str
    userId: int


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(items: list[str]):
    hf_key = os.environ.get("HF_API_KEY")
    if not hf_key:
        # No embedding service configured — return nulls, logs stored without vectors
        return [None] * len(items)
    try:
        r = httpx.post(
            HF_API_URL,
            headers={"Authorization": f"Bearer {hf_key}"},
            json={"inputs": items},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[embed] HuggingFace API error: {e}", flush=True)
        return [None] * len(items)


@app.post("/analyze")
async def analyze(payload: AnalyzeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_analysis, payload.startTime, payload.endTime, payload.userId)
    return {"status": "queued"}
