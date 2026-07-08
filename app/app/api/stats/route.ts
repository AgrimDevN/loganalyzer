import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.userId;

  try {
    const [bySeverity, totals, activeAlerts, hourly] = await Promise.all([
      db.execute(sql`
        SELECT severity, COUNT(*)::int AS count FROM logs WHERE user_id = ${uid} GROUP BY severity
      `),
      db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM logs WHERE user_id = ${uid}) AS total_logs,
          (SELECT COUNT(*)::int FROM logs WHERE user_id = ${uid} AND severity IN ('critical','error')) AS error_logs,
          (SELECT COUNT(*)::int FROM incidents WHERE user_id = ${uid}) AS total_incidents
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM alerts
        WHERE dispatched = false
          AND incident_id IN (SELECT id FROM incidents WHERE user_id = ${uid})
      `),
      db.execute(sql`
        SELECT
          to_char(date_trunc('hour', created_at), 'HH24:MI') AS hour,
          severity,
          COUNT(*)::int AS count
        FROM logs
        WHERE created_at >= NOW() - INTERVAL '24 hours' AND user_id = ${uid}
        GROUP BY date_trunc('hour', created_at), hour, severity
        ORDER BY date_trunc('hour', created_at) ASC
      `),
    ]);

    const t = totals.rows[0] as Record<string, number>;

    return NextResponse.json({
      bySeverity: bySeverity.rows,
      totalLogs: t?.total_logs ?? 0,
      errorLogs: t?.error_logs ?? 0,
      totalIncidents: t?.total_incidents ?? 0,
      activeAlerts: (activeAlerts.rows[0] as Record<string, number>)?.count ?? 0,
      hourly: hourly.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
