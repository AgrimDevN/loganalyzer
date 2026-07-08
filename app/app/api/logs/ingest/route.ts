import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { logs } from "@/db/schema";
import { logEvents } from "@/lib/log-events";

type IncomingLog = {
  serviceName: string;
  severity: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

function isValidLog(entry: unknown): entry is IncomingLog {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.serviceName === "string" &&
    typeof e.severity === "string" &&
    typeof e.message === "string" &&
    typeof e.timestamp === "string"
  );
}

const ALERT_SEVERITIES = new Set(["critical", "error"]);
const AGENT_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";

// Fire-and-forget: call /analyze immediately. Render responds with {"status":"queued"}
// instantly and runs the crew in the background. The Python-side lock prevents
// duplicate concurrent runs if multiple elevated logs arrive in quick succession.
function triggerAnalysis(logTimestamp: Date) {
  const startTime = new Date(logTimestamp.getTime() - 5 * 60 * 1000);
  const endTime = new Date(logTimestamp.getTime() + 5 * 60 * 1000);

  fetch(`${AGENT_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }),
  }).catch((err) => {
    console.warn("Analysis service unreachable, skipping crew trigger:", err);
  });
}

async function embedMessages(messages: string[]): Promise<(number[] | null)[]> {
  try {
    const response = await fetch(`${AGENT_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.warn(`Embedding service returned ${response.status}`);
      return messages.map(() => null);
    }

    const embeddings: number[][] = await response.json();
    return embeddings;
  } catch (err) {
    console.warn("Embedding service unreachable, inserting logs without embeddings:", err);
    return messages.map(() => null);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const entries = Array.isArray(body) ? body : [body];
  const validEntries = entries.filter(isValidLog);

  if (validEntries.length === 0) {
    return NextResponse.json(
      { error: "No valid log entries (expected serviceName, severity, message, timestamp)" },
      { status: 400 }
    );
  }

  const embeddings = await embedMessages(validEntries.map((entry) => entry.message));

  const inserted = await db
    .insert(logs)
    .values(
      validEntries.map((entry, i) => ({
        serviceName: entry.serviceName,
        severity: entry.severity,
        message: entry.message,
        metadata: entry.metadata ?? null,
        embedding: embeddings[i] ?? null,
        createdAt: new Date(entry.timestamp),
      }))
    )
    .returning();

  for (const row of inserted) {
    logEvents.emit("log", row);

    if (ALERT_SEVERITIES.has(row.severity)) {
      triggerAnalysis(row.createdAt);
    }
  }

  return NextResponse.json({ inserted }, { status: 201 });
}
