#!/usr/bin/env python
"""
Package entry point wired to pyproject.toml [project.scripts].

  research_crew <startTime> <endTime>   — analyze a specific window
  research_crew                          — analyze the last 10 minutes
  crewai run                             — same as above (no-arg form)
"""
import sys
import warnings
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()
warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

from research_crew.analyzer import run_analysis
from research_crew.crew import LogAnalyzerCrew


def _resolve_window() -> tuple[str, str]:
    """Return (startTime, endTime) from argv or default to last 10 minutes."""
    if len(sys.argv) >= 3:
        return sys.argv[1], sys.argv[2]
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=10)
    return start.isoformat(), now.isoformat()


def run():
    """Fetch logs for the window, run the full crew pipeline, store the incident."""
    start_time, end_time = _resolve_window()
    print(f"[run] Analyzing window: {start_time} → {end_time}")

    report = run_analysis(start_time, end_time)
    if report:
        print("\n" + "=" * 60)
        print(report)
    else:
        print("[run] Nothing to report for this window.")


def train():
    """Train the crew for N iterations (crewai train <n> <filename>)."""
    if len(sys.argv) < 3:
        print("Usage: train <n_iterations> <output_file>")
        sys.exit(1)

    start_time, end_time = _resolve_window()
    inputs = {
        "startTime": start_time,
        "endTime": end_time,
        "logs_json": "[]",
    }

    try:
        LogAnalyzerCrew().crew().train(
            n_iterations=int(sys.argv[1]),
            filename=sys.argv[2],
            inputs=inputs,
        )
    except Exception as e:
        raise Exception(f"Training failed: {e}")


def replay():
    """Replay a specific task execution by task ID (crewai replay <task_id>)."""
    if len(sys.argv) < 2:
        print("Usage: replay <task_id>")
        sys.exit(1)

    try:
        LogAnalyzerCrew().crew().replay(task_id=sys.argv[1])
    except Exception as e:
        raise Exception(f"Replay failed: {e}")


def test():
    """Test crew execution and evaluate results (crewai test <n> <eval_llm>)."""
    if len(sys.argv) < 3:
        print("Usage: test <n_iterations> <eval_llm>")
        sys.exit(1)

    start_time, end_time = _resolve_window()
    inputs = {
        "startTime": start_time,
        "endTime": end_time,
        "logs_json": "[]",
    }

    try:
        LogAnalyzerCrew().crew().test(
            n_iterations=int(sys.argv[1]),
            eval_llm=sys.argv[2],
            inputs=inputs,
        )
    except Exception as e:
        raise Exception(f"Test failed: {e}")


if __name__ == "__main__":
    run()
