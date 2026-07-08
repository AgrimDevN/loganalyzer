import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { incidents, alerts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, Zap, AlertTriangle, Bell } from "lucide-react";
import { SeverityDot } from "@/components/SeverityBadge";
import { LogVolumeChart } from "@/components/LogVolumeChart";
import { SeverityDonut } from "@/components/SeverityDonut";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getDashboardData(uid: number) {
  const [totals, bySeverity, activeAlerts, hourly, recentIncidents, recentAlerts] =
    await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM logs WHERE user_id = ${uid})                                        AS total_logs,
          (SELECT COUNT(*)::int FROM logs WHERE user_id = ${uid} AND severity IN ('critical','error'))   AS error_logs,
          (SELECT COUNT(*)::int FROM incidents WHERE user_id = ${uid})                                   AS total_incidents
      `),
      db.execute(sql`
        SELECT severity, COUNT(*)::int AS count FROM logs WHERE user_id = ${uid} GROUP BY severity
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
      db.select().from(incidents).where(eq(incidents.userId, uid)).orderBy(desc(incidents.createdAt)).limit(6),
      db
        .select({
          id: alerts.id,
          severity: alerts.severity,
          message: alerts.message,
          createdAt: alerts.createdAt,
          incidentId: alerts.incidentId,
          incidentTitle: incidents.title,
        })
        .from(alerts)
        .leftJoin(incidents, eq(alerts.incidentId, incidents.id))
        .where(eq(incidents.userId, uid))
        .orderBy(desc(alerts.createdAt))
        .limit(7),
    ]);

  const t = totals.rows[0] as Record<string, number>;
  return {
    totalLogs:      t?.total_logs ?? 0,
    errorLogs:      t?.error_logs ?? 0,
    totalIncidents: t?.total_incidents ?? 0,
    activeAlerts:   (activeAlerts.rows[0] as Record<string, number>)?.count ?? 0,
    bySeverity:     bySeverity.rows as { severity: string; count: number }[],
    hourly:         hourly.rows as { hour: string; severity: string; count: number }[],
    recentIncidents,
    recentAlerts,
  };
}

function timeAgo(d: Date) {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Stat({
  label, value, sub, icon: Icon, iconColor,
}: {
  label: string; value: number; sub: string;
  icon: React.ElementType; iconColor: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
          {label}
        </p>
        <Icon className="w-[15px] h-[15px] shrink-0 mt-px" style={{ color: iconColor }} />
      </div>
      <p className="text-[32px] font-semibold leading-none" style={{ color: "var(--text-1)" }}>
        {value.toLocaleString()}
      </p>
      <p className="text-[12px] mt-2" style={{ color: "var(--text-3)" }}>{sub}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const d = await getDashboardData(session.userId);

  return (
    <div className="px-7 py-6 max-w-[1320px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: "var(--text-1)" }}>Overview</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-3)" }}>
            Log volume, incidents, and active alerts
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{ background: "rgba(12,163,12,0.08)", border: "1px solid rgba(12,163,12,0.2)", color: "#0ca30c" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0ca30c" }} />
          Live
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Logs"        value={d.totalLogs}      sub="All time"     icon={Database}      iconColor="var(--s-info)" />
        <Stat label="Errors & Criticals" value={d.errorLogs}      sub="All time"     icon={Zap}           iconColor="var(--s-critical)" />
        <Stat label="Incidents"          value={d.totalIncidents} sub="AI-detected"  icon={AlertTriangle} iconColor="var(--s-warning)" />
        <Stat label="Active Alerts"      value={d.activeAlerts}   sub="Undispatched" icon={Bell}          iconColor="var(--s-error)" />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div
          className="lg:col-span-2 rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Log Volume</p>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>Last 24 hours</p>
          </div>
          <LogVolumeChart data={d.hourly} />
        </div>

        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[13px] font-medium mb-5" style={{ color: "var(--text-2)" }}>
            Severity Breakdown
          </p>
          <SeverityDonut data={d.bySeverity} />
        </div>
      </div>

      {/* ── Data row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Recent incidents */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Recent Incidents</p>
            <Link
              href="/incidents"
              className="text-[11px] transition-colors"
              style={{ color: "var(--accent)" }}
            >
              View all →
            </Link>
          </div>

          {d.recentIncidents.length === 0 ? (
            <p className="text-center text-[13px] py-10" style={{ color: "var(--text-3)" }}>
              No incidents detected yet
            </p>
          ) : (
            <div>
              {d.recentIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/incidents/${inc.id}`}
                  className="row-hover flex items-start gap-3 px-5 py-3 transition-colors duration-100"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] truncate" style={{ color: "var(--text-1)" }}>
                      {inc.title}
                    </p>
                    {inc.rootCause && (
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                        {inc.rootCause}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0 mt-px" style={{ color: "var(--text-3)" }}>
                    {timeAgo(new Date(inc.createdAt))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent alerts */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <div
            className="px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "var(--text-2)" }}>Recent Alerts</p>
          </div>

          {d.recentAlerts.length === 0 ? (
            <p className="text-center text-[13px] py-10" style={{ color: "var(--text-3)" }}>
              No alerts yet
            </p>
          ) : (
            <div>
              {d.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 px-5 py-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <SeverityDot severity={alert.severity} />
                  <div className="flex-1 min-w-0 mt-[-1px]">
                    {alert.incidentTitle && (
                      <p className="text-[11px] truncate" style={{ color: "var(--accent)" }}>
                        {alert.incidentTitle}
                      </p>
                    )}
                    <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: "var(--text-2)" }}>
                      {alert.message}
                    </p>
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--text-3)" }}>
                    {timeAgo(new Date(alert.createdAt))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

