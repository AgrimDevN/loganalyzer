"""
Core analysis pipeline — shared by the FastAPI /analyze endpoint and the CLI runner.
Fetch logs from DB → run LogAnalyzerCrew → store incident + alert.
"""
import json
import os
import threading

import psycopg2
from pathlib import Path
from dotenv import load_dotenv

_lock = threading.Lock()

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from research_crew.crew import LogAnalyzerCrew
from research_crew.tools.log_tools import set_user_id

DATABASE_URL = os.environ["DATABASE_URL"]


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def fetch_logs(start_time: str, end_time: str, user_id: int) -> list[dict]:
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT service_name, severity, message, created_at
                FROM logs
                WHERE created_at >= %s AND created_at <= %s AND user_id = %s
                ORDER BY created_at ASC
                LIMIT 500
                """,
                (start_time, end_time, user_id),
            )
            return [
                {
                    "serviceName": row[0],
                    "severity": row[1],
                    "message": row[2],
                    "createdAt": row[3].isoformat(),
                }
                for row in cur.fetchall()
            ]
    finally:
        conn.close()


def _extract_section(report: str, header: str) -> str:
    lines = report.split("\n")
    capturing = False
    section_lines = []
    for line in lines:
        if line.strip().startswith("## ") and header.lower() in line.lower():
            capturing = True
            continue
        if capturing:
            if line.strip().startswith("## "):
                break
            section_lines.append(line)
    return "\n".join(section_lines).strip()


def store_incident(report: str, user_id: int):
    title = "Incident Detected"
    for line in report.strip().split("\n"):
        if line.startswith("#"):
            title = line.lstrip("# ").replace("Incident:", "").strip()
            break

    root_cause = _extract_section(report, "Root Cause") or "See full report"
    summary = _extract_section(report, "Executive Summary")
    alert_message = (summary or report)[:500]

    severity = "critical"
    report_top = report[:400]
    if "P2" in report_top:
        severity = "error"
    elif "P3" in report_top:
        severity = "warning"

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO incidents (user_id, title, root_cause, related_log_ids) VALUES (%s, %s, %s, %s) RETURNING id",
                (user_id, title, root_cause, json.dumps([])),
            )
            incident_id = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO alerts (incident_id, severity, message, dispatched) VALUES (%s, %s, %s, false)",
                (incident_id, severity, alert_message),
            )
        conn.commit()
    finally:
        conn.close()


def run_analysis(start_time: str, end_time: str, user_id: int):
    if not _lock.acquire(blocking=False):
        print("[analyze] Crew already running, skipping this window.", flush=True)
        return None

    try:
        logs = fetch_logs(start_time, end_time, user_id)
        elevated = [l for l in logs if l["severity"] in ("critical", "error")]

        if not elevated:
            print(f"[analyze] No elevated logs in {start_time} – {end_time}, skipping.", flush=True)
            return None

        print(f"[analyze] {len(logs)} logs ({len(elevated)} elevated) in window {start_time} – {end_time}", flush=True)

        set_user_id(user_id)
        result = LogAnalyzerCrew().crew().kickoff(inputs={
            "startTime": start_time,
            "endTime": end_time,
            "logs_json": json.dumps(elevated),
        })
        store_incident(result.raw, user_id)
        print("[analyze] Incident stored.", flush=True)
        return result.raw
    except Exception as e:
        print(f"[analyze] Crew failed: {e}", flush=True)
        return None
    finally:
        _lock.release()
