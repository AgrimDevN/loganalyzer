import json
import os

import psycopg2
from crewai.tools import tool

DATABASE_URL = os.environ.get("DATABASE_URL", "postgres://postgres:password@localhost:5432/vectordb")

_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L12-v2")
    return _model


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


@tool("semantic_search")
def semantic_search(query_text: str) -> str:
    """
    Search for log entries semantically similar to the query text using pgvector cosine similarity.
    Use this to find historical log patterns similar to what you are investigating.
    Returns up to 15 matching log entries ordered by similarity (highest first).
    """
    embedding = _get_model().encode([query_text])[0].tolist()
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
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
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
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
                return json.dumps({"message": "No past incidents found in the database."})
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
