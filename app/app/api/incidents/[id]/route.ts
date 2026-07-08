import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { incidents, alerts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id);

  try {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, numId), eq(incidents.userId, session.userId)));

    if (!incident)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const incidentAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.incidentId, numId));

    return NextResponse.json({ ...incident, alerts: incidentAlerts });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
