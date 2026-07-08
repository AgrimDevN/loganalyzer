import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/db/client";
import { logs, users } from "@/db/schema";
import { logEvents } from "@/lib/log-events";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";

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

async function resolveUserId(request: NextRequest): Promise<number | null> {
  // Session cookie — used by the dashboard and the in-browser demo replay
  const session = await getSession();
  if (session) return session.userId;

  // X-Api-Key header — used by external services / curl / replay scripts
  const apiKey = request.headers.get("X-Api-Key");
  if (apiKey) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.apiKey, apiKey));
    return user?.id ?? null;
  }

  return null;
}

const ALERT_SEVERITIES = new Set(["critical", "error"]);
const AGENT_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";

function triggerAnalysis(logTimestamp: Date, userId: number) {
  const startTime = new Date(logTimestamp.getTime() - 5 * 60 * 1000);
  const endTime = new Date(logTimestamp.getTime() + 5 * 60 * 1000);

  waitUntil(
    fetch(`${AGENT_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        userId,
      }),
    }).catch((err) => {
      console.warn("Analysis service unreachable, skipping crew trigger:", err);
    })
  );
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (userId === null) {
    return NextResponse.json(
      { error: "Unauthorized: provide a session cookie or X-Api-Key header" },
      { status: 401 }
    );
  }

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

  const inserted = await db
    .insert(logs)
    .values(
      validEntries.map((entry) => ({
        userId,
        serviceName: entry.serviceName,
        severity: entry.severity,
        message: entry.message,
        metadata: entry.metadata ?? null,
        embedding: null,
        createdAt: new Date(entry.timestamp),
      }))
    )
    .returning();

  for (const row of inserted) {
    logEvents.emit(`log:${userId}`, row);

    if (ALERT_SEVERITIES.has(row.severity)) {
      triggerAnalysis(row.createdAt, userId);
    }
  }

  return NextResponse.json({ inserted }, { status: 201 });
}
