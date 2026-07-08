import json
import os
import threading

import httpx
import psycopg2
from crewai.tools import tool

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/vectordb")
HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L12-v2"

# Set by analyzer.py before kicking off the crew so tools know which user to scope to
_context = threading.local()


def set_user_id(user_id: int):
    _context.user_id = user_id


def _get_user_id() -> int | None:
    return getattr(_context, "user_id", None)


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def _embed(text: str) -> list[float] | None:
    hf_key = os.environ.get("HF_API_KEY")
    if not hf_key:
        return None
    try:
        r = httpx.post(
            HF_API_URL,
            headers={"Authorization": f"Bearer {hf_key}"},
            json={"inputs": [text]},
            timeout=30,
        )
        r.raise_for_status()
        result = r.json()
        # HF returns list of embeddings; grab the first one
        return result[0] if isinstance(result, list) and result else None
    except Exception as e:
        print(f"[embed] HuggingFace API error: {e}", flush=True)
        return None


@tool("semantic_search")
def semantic_search(query_text: str) -> str:
    """
    Search for log entries semantically similar to the query text using pgvector cosine similarity.
    Use this to find historical log patterns similar to what you are investigating.
    Returns up to 15 matching log entries ordered by similarity (highest first).
    """
    embedding = _embed(query_text)
    if embedding is None:
        return json.dumps({"message": "Embedding service unavailable, cannot perform semantic search."})

    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    user_id = _get_user_id()

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            if user_id is not None:
                cur.execute(
                    """
                    SELECT service_name, severity, message, created_at,
                           1 - (embedding <=> %s::vector) AS similarity
                    FROM logs
                    WHERE embedding IS NOT NULL AND user_id = %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT 15
                    """,
                    (embedding_str, user_id, embedding_str),
                )
            else:
                cur.execute(
                    """
                    SELECT service_name, severity, message, created_at,
                           1 - (embedding <=> %s::vector) AS similarity
                    FROM logs
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> %s::vector
                    LIMIT 15
                    """,
                    (embedding_str, embedding_str),
                )
            rows = cur.fetchall()
            if not rows:
                return json.dumps({"message": "No similar logs found."})
            return json.dumps([
                {
                    "serviceName": row[0],
                    "severity": row[1],
                    "message": row[2],
                    "createdAt": row[3].isoformat(),
                    "similarity": round(float(row[4]), 4),
                }
                for row in rows
            ])
    finally:
        conn.close()


@tool("get_past_incidents")
def get_past_incidents(limit: int = 5) -> str:
    """
    Retrieve the most recent past incidents from the database for precedent comparison.
    Use this to check whether the current failure pattern has been seen before.
    Returns a JSON array of past incidents with their title, root cause, and timestamp.
    """
    user_id = _get_user_id()
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            if user_id is not None:
                cur.execute(
                    """
                    SELECT title, root_cause, created_at
                    FROM incidents
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (user_id, limit),
                )
            else:
                cur.execute(
                    """
                    SELECT title, root_cause, created_at
                    FROM incidents
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
            rows = cur.fetchall()
            if not rows:
                return json.dumps({"message": "No past incidents found."})
            return json.dumps([
                {
                    "title": row[0],
                    "rootCause": row[1],
                    "createdAt": row[2].isoformat() if row[2] else None,
                }
                for row in rows
            ])
    finally:
        conn.close()
