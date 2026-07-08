import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts, incidents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await db
      .select({
        id: alerts.id,
        incidentId: alerts.incidentId,
        severity: alerts.severity,
        message: alerts.message,
        dispatched: alerts.dispatched,
        createdAt: alerts.createdAt,
        incidentTitle: incidents.title,
      })
      .from(alerts)
      .leftJoin(incidents, eq(alerts.incidentId, incidents.id))
      .where(eq(incidents.userId, session.userId))
      .orderBy(desc(alerts.createdAt))
      .limit(20);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
