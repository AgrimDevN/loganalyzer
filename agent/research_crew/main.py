import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

from research_crew.analyzer import run_analysis

model = SentenceTransformer("sentence-transformers/all-MiniLM-L12-v2")
app = FastAPI()


class AnalyzeRequest(BaseModel):
    startTime: str
    endTime: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(items: list[str]):
    embeddings = model.encode(items)
    return embeddings.tolist()


@app.post("/analyze")
async def analyze(payload: AnalyzeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_analysis, payload.startTime, payload.endTime)
    return {"status": "queued"}
