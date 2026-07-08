import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const AGENT_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { startTime, endTime } = await request.json();

  try {
    const res = await fetch(`${AGENT_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime, userId: session.userId }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Analyze proxy error:", err);
    return NextResponse.json({ error: "Agent service unreachable" }, { status: 502 });
  }
}
