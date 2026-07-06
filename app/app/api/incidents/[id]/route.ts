import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { incidents, alerts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id);

  try {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, numId));

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
