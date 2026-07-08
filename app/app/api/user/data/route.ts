import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { logs, incidents, alerts } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.userId;

  // Delete alerts first (FK → incidents)
  const userIncidents = await db
    .select({ id: incidents.id })
    .from(incidents)
    .where(eq(incidents.userId, uid));

  if (userIncidents.length > 0) {
    await db
      .delete(alerts)
      .where(inArray(alerts.incidentId, userIncidents.map((i) => i.id)));
  }

  await db.delete(incidents).where(eq(incidents.userId, uid));
  await db.delete(logs).where(eq(logs.userId, uid));

  return NextResponse.json({ ok: true });
}
