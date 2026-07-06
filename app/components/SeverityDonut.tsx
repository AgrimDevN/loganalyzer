"use client";

type Row = { severity: string; count: number };

const SEV_ORDER = ["critical", "error", "warning", "info", "debug"];
const SEV_COLORS: Record<string, string> = {
  critical: "#d03b3b",
  error:    "#e07845",
  warning:  "#d4950a",
  info:     "#3987e5",
  debug:    "#566680",
};

export function SeverityDonut({ data }: { data: Row[] }) {
  const sorted = SEV_ORDER
    .map(s => data.find(r => r.severity.toLowerCase() === s))
    .filter(Boolean) as Row[];

  const total = sorted.reduce((sum, r) => sum + r.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-[13px]" style={{ color: "var(--text-3)" }}>
        No log data yet
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((row) => {
        const pct = Math.round((row.count / total) * 100);
        const color = SEV_COLORS[row.severity.toLowerCase()] ?? "#566680";
        return (
          <div key={row.severity} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span
                className="text-[12px] capitalize"
                style={{ color: "var(--text-2)" }}
              >
                {row.severity}
              </span>
            </div>

            {/* Track: lighter step of same ramp (per mark spec: unfilled = lighter same hue) */}
            <div
              className="flex-1 h-[5px] rounded-full overflow-hidden"
              style={{ background: "var(--bg-hover)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>

            <div className="flex items-center gap-2 w-[52px] justify-end shrink-0">
              <span className="text-[11px] font-mono" style={{ color: "var(--text-1)" }}>
                {row.count.toLocaleString()}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                {pct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
