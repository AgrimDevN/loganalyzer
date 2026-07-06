import { db } from "@/db/client";
import { incidents, alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";

export const dynamic = "force-dynamic";

async function getIncident(id: number) {
  const [inc] = await db.select().from(incidents).where(eq(incidents.id, id));
  if (!inc) return null;
  const incAlerts = await db.select().from(alerts).where(eq(alerts.incidentId, id));
  return { ...inc, alerts: incAlerts };
}

function timeAgo(d: Date) {
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* Minimal markdown → React — handles only what the crew generates */
function Report({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (l.startsWith("# ")) {
      nodes.push(
        <h1 key={i} className="text-[16px] font-bold mt-5 mb-1" style={{ color: "var(--text-1)" }}>
          {l.slice(2)}
        </h1>,
      );
    } else if (l.startsWith("## ")) {
      nodes.push(
        <h2
          key={i}
          className="text-[11px] font-semibold uppercase tracking-widest mt-6 mb-2 pb-1.5"
          style={{ color: "var(--accent)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          {l.slice(3)}
        </h2>,
      );
    } else if (l.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="text-[13px] font-semibold mt-3 mb-1" style={{ color: "var(--text-1)" }}>
          {l.slice(4)}
        </h3>,
      );
    } else if (l.match(/^[-*] /)) {
      nodes.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="mt-[6px] w-1 h-1 rounded-full shrink-0" style={{ background: "var(--text-3)" }} />
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {l.replace(/^[-*] /, "")}
          </p>
        </div>,
      );
    } else if (l.match(/^\d+\. /)) {
      const n = l.match(/^(\d+)\. /)?.[1];
      nodes.push(
        <div key={i} className="flex gap-2.5 my-0.5">
          <span className="text-[11px] font-mono mt-[2px] shrink-0" style={{ color: "var(--text-3)" }}>{n}.</span>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {l.replace(/^\d+\. /, "")}
          </p>
        </div>,
      );
    } else if (l.trim() === "") {
      nodes.push(<div key={i} className="h-1" />);
    } else {
      nodes.push(
        <p key={i} className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
          {l}
        </p>,
      );
    }
  }

  return <div className="space-y-0.5">{nodes}</div>;
}

const SEV_ORDER = ["critical", "error", "warning", "info", "debug"];

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inc = await getIncident(parseInt(id));
  if (!inc) notFound();

  const topSev =
    inc.alerts.length > 0
      ? inc.alerts.reduce((top, a) => {
          return SEV_ORDER.indexOf(a.severity) < SEV_ORDER.indexOf(top)
            ? a.severity
            : top;
        }, inc.alerts[0].severity)
      : null;

  return (
    <div className="px-7 py-6 max-w-[1100px] mx-auto">

      {/* Back */}
      <Link
        href="/incidents"
        className="link-hover inline-flex items-center gap-1.5 text-[12px] mb-5 transition-colors"
        style={{ color: "var(--text-3)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Incidents
      </Link>

      {/* Title row */}
      <div className="flex items-start gap-3 flex-wrap mb-1.5">
        <h1 className="text-[20px] font-semibold leading-snug flex-1" style={{ color: "var(--text-1)" }}>
          {inc.title}
        </h1>
        {topSev && <SeverityBadge severity={topSev} size="md" />}
      </div>
      <div className="flex items-center gap-1.5 mb-6 text-[12px]" style={{ color: "var(--text-3)" }}>
        <Clock className="w-3 h-3" />
        Detected {timeAgo(new Date(inc.createdAt))} ·{" "}
        {new Date(inc.createdAt).toLocaleString()}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* AI report */}
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--text-3)" }}
          >
            AI Analysis Report
          </p>
          {inc.rootCause ? (
            <Report text={inc.rootCause} />
          ) : (
            <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
              No report available.
            </p>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">

          {/* Alerts */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                Alerts · {inc.alerts.length}
              </p>
            </div>

            {inc.alerts.length === 0 ? (
              <p className="px-4 py-4 text-[12px]" style={{ color: "var(--text-3)" }}>No alerts</p>
            ) : (
              <div>
                {inc.alerts.map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-3 space-y-1.5"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div className="flex items-center justify-between">
                      <SeverityBadge severity={a.severity} />
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={
                          a.dispatched
                            ? { background: "rgba(12,163,12,0.10)", color: "#0ca30c", border: "1px solid rgba(12,163,12,0.2)" }
                            : { background: "rgba(212,149,10,0.10)", color: "var(--s-warning)", border: "1px solid rgba(212,149,10,0.2)" }
                        }
                      >
                        {a.dispatched ? "dispatched" : "pending"}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                      {a.message}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {timeAgo(new Date(a.createdAt))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div
            className="rounded-xl px-4 py-3 space-y-2.5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
              Metadata
            </p>
            <div className="space-y-2">
              {[
                { label: "Incident ID", value: `#${inc.id}` },
                { label: "Detected",    value: new Date(inc.createdAt).toLocaleString() },
                { label: "Alerts",      value: String(inc.alerts.length) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</span>
                  <span className="text-[11px] font-mono text-right" style={{ color: "var(--text-2)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
