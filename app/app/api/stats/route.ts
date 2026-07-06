import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [bySeverity, totals, activeAlerts, hourly] = await Promise.all([
      db.execute(sql`
        SELECT severity, COUNT(*)::int AS count FROM logs GROUP BY severity
      `),
      db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM logs) AS total_logs,
          (SELECT COUNT(*)::int FROM logs WHERE severity IN ('critical','error')) AS error_logs,
          (SELECT COUNT(*)::int FROM incidents) AS total_incidents
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM alerts WHERE dispatched = false
      `),
      db.execute(sql`
        SELECT
          to_char(date_trunc('hour', created_at), 'HH24:MI') AS hour,
          severity,
          COUNT(*)::int AS count
        FROM logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
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
