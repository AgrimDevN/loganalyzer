import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { alerts, incidents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
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
      .orderBy(desc(alerts.createdAt))
      .limit(20);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
