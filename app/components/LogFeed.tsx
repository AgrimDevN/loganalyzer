"use client";
import { useEffect, useRef, useState } from "react";
import { SeverityBadge } from "./SeverityBadge";

type Log = {
  id: number;
  serviceName: string;
  severity: string;
  message: string;
  createdAt: string;
};

const SEV_ORDER = ["all", "critical", "error", "warning", "info", "debug"];

export function LogFeed() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("all");
  const [paused, setPaused] = useState(false);
  const [total, setTotal] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const bufRef = useRef<Log[]>([]);
  const seenIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    pausedRef.current = paused;
    if (!paused && bufRef.current.length > 0) {
      setLogs((p) => [...p, ...bufRef.current].slice(-800));
      bufRef.current = [];
    }
  }, [paused]);

  useEffect(() => {
    // Load recent history first so logs persist across navigations
    fetch("/api/logs/recent?limit=100")
      .then((r) => r.json())
      .then((recent: Log[]) => {
        // DB returns newest-first; reverse so oldest appears at top
        const ordered = [...recent].reverse();
        for (const log of ordered) seenIds.current.add(log.id);
        setLogs(ordered);
        setTotal(ordered.length);
      })
      .catch(() => {});

    const es = new EventSource("/api/logs/stream");
    es.onmessage = (e) => {
      const log = JSON.parse(e.data) as Log;
      // Skip logs already loaded from history to avoid duplicates
      if (seenIds.current.has(log.id)) return;
      seenIds.current.add(log.id);
      setTotal((c) => c + 1);
      if (pausedRef.current) bufRef.current.push(log);
      else setLogs((p) => [...p, log].slice(-800));
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, paused]);

  const visible =
    filter === "all" ? logs : logs.filter((l) => l.severity.toLowerCase() === filter);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {/* Filter pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {SEV_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-2.5 py-1 rounded text-[11px] font-medium uppercase tracking-wide transition-all duration-100"
              style={
                filter === s
                  ? { background: "var(--accent-dim)", color: "var(--text-1)", border: "1px solid var(--accent-border)" }
                  : { color: "var(--text-3)", border: "1px solid transparent" }
              }
              onMouseEnter={(e) => {
                if (filter !== s) (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
              }}
              onMouseLeave={(e) => {
                if (filter !== s) (e.currentTarget as HTMLElement).style.color = "var(--text-3)";
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-3)" }}
          >
            {total.toLocaleString()} events
          </span>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: paused ? "var(--s-warning)" : "#0ca30c" }}
            />
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {paused ? "paused" : "live"}
            </span>
          </div>

          <button
            onClick={() => setPaused((p) => !p)}
            className="text-[11px] px-2.5 py-1 rounded transition-all duration-100"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
          >
            {paused
              ? `Resume${bufRef.current.length > 0 ? ` (+${bufRef.current.length})` : ""}`
              : "Pause"}
          </button>
        </div>
      </div>

      {/* Log rows */}
      <div className="flex-1 overflow-y-auto" style={{ fontFamily: "var(--font-geist-mono, monospace)" }}>
        {visible.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-40 gap-2 text-[13px]"
            style={{ color: "var(--text-3)" }}
          >
            <span>—</span>
            <span>Waiting for log events…</span>
          </div>
        ) : (
          visible.map((log) => <LogRow key={log.id} log={log} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* Single severity color for left-border strip */
const SEV_COLOR: Record<string, string> = {
  critical: "var(--s-critical)",
  error:    "var(--s-error)",
  warning:  "var(--s-warning)",
  info:     "var(--s-info)",
  debug:    "var(--s-debug)",
};

function LogRow({ log }: { log: Log }) {
  const time = new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false });
  const sev = log.severity.toLowerCase();
  return (
    <div
      className="group flex items-start gap-3 py-1.5 pr-4 text-[12px] transition-colors duration-75"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--bg-surface)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {/* Left severity strip */}
      <span
        className="w-[3px] self-stretch shrink-0 rounded-r-sm"
        style={{ background: SEV_COLOR[sev] ?? "transparent", opacity: 0.6 }}
      />

      <span
        className="shrink-0 w-[72px] tabular-nums text-[11px] mt-px"
        style={{ color: "var(--text-3)" }}
      >
        {time}
      </span>

      <span className="shrink-0 mt-px">
        <SeverityBadge severity={log.severity} />
      </span>

      <span
        className="shrink-0 w-[130px] truncate mt-px text-[11px]"
        style={{ color: "var(--accent)" }}
      >
        {log.serviceName}
      </span>

      <span className="truncate mt-px" style={{ color: "var(--text-2)" }}>
        {log.message}
      </span>
    </div>
  );
}
