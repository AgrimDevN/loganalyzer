import { db } from "@/db/client";
import { incidents, alerts } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";

export const dynamic = "force-dynamic";


async function getIncidents() {
  return db
    .select({
      id:         incidents.id,
      title:      incidents.title,
      rootCause:  incidents.rootCause,
      createdAt:  incidents.createdAt,
      alertCount: sql<number>`COUNT(${alerts.id})::int`,
      topSev:     sql<string>`MAX(${alerts.severity})`,
    })
    .from(incidents)
    .leftJoin(alerts, eq(alerts.incidentId, incidents.id))
    .groupBy(incidents.id)
    .orderBy(desc(incidents.createdAt));
}

function timeAgo(d: Date) {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SEV_STRIP: Record<string, string> = {
  critical: "var(--s-critical)",
  error:    "var(--s-error)",
  warning:  "var(--s-warning)",
  info:     "var(--s-info)",
  debug:    "var(--s-debug)",
};

export default async function IncidentsPage() {
  const list = await getIncidents();

  return (
    <div className="px-7 py-6 max-w-[1000px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold" style={{ color: "var(--text-1)" }}>Incidents</h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {list.length} AI-detected incident{list.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-28 rounded-xl gap-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: "var(--text-3)" }} />
          <p className="text-[14px] font-medium" style={{ color: "var(--text-2)" }}>No incidents detected</p>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
            The AI crew triggers when elevated log patterns are found
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_100px_80px_90px_32px] gap-4 px-5 py-2.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {["Incident", "Severity", "Alerts", "Detected", ""].map((h) => (
              <span
                key={h}
                className="text-[10px] font-medium uppercase tracking-widest"
                style={{ color: "var(--text-3)" }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {list.map((inc) => {
            const sev = (inc.topSev ?? "info").toLowerCase();
            const strip = SEV_STRIP[sev] ?? "var(--s-info)";
            return (
              <Link
                key={inc.id}
                href={`/incidents/${inc.id}`}
                className="row-hover group relative grid grid-cols-[1fr_100px_80px_90px_32px] gap-4 px-5 py-3.5 items-center transition-colors duration-100"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                {/* Left severity strip */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: strip, opacity: 0.5 }}
                />

                {/* Title + root cause */}
                <div className="min-w-0 pl-1">
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {inc.title}
                  </p>
                  {inc.rootCause && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-3)" }}>
                      {inc.rootCause}
                    </p>
                  )}
                </div>

                {/* Severity */}
                <div>
                  {inc.topSev && <SeverityBadge severity={inc.topSev} />}
                </div>

                {/* Alert count */}
                <p className="text-[12px] font-mono" style={{ color: "var(--text-2)" }}>
                  {inc.alertCount ?? 0}
                </p>

                {/* Time */}
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {timeAgo(new Date(inc.createdAt))}
                </p>

                {/* Arrow */}
                <ChevronRight
                  className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-3)" }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
