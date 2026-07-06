"use client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

type HourlyRow = { hour: string; severity: string; count: number };

/* Reference palette — status colors for severity */
const SEV_COLORS: Record<string, string> = {
  critical: "#d03b3b",
  error:    "#e07845",
  warning:  "#d4950a",
  info:     "#3987e5",
  debug:    "#566680",
};

const SEV_ORDER = ["debug", "info", "warning", "error", "critical"] as const;

function pivot(rows: HourlyRow[]) {
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const entry = map.get(row.hour) ?? {};
    entry[row.severity] = (entry[row.severity] ?? 0) + row.count;
    map.set(row.hour, entry);
  }
  return Array.from(map.entries()).map(([hour, vals]) => ({ hour, ...vals }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-[12px] space-y-1 min-w-[120px]"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <p className="font-medium mb-1.5" style={{ color: "var(--text-2)" }}>{label}</p>
      {[...payload].reverse().map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: SEV_COLORS[p.dataKey] ?? "#566680" }} />
            <span style={{ color: "var(--text-2)" }} className="capitalize">{p.dataKey}</span>
          </div>
          <span className="font-mono" style={{ color: "var(--text-1)" }}>{p.value ?? 0}</span>
        </div>
      ))}
    </div>
  );
};

export function LogVolumeChart({ data }: { data: HourlyRow[] }) {
  const chartData = pivot(data);
  const presentSeverities = SEV_ORDER.filter(s => data.some(r => r.severity === s));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-[13px]" style={{ color: "var(--text-3)" }}>
        No activity in the last 24 hours
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -20 }}>
        <defs>
          {presentSeverities.map((s) => (
            <linearGradient key={s} id={`fill-${s}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={SEV_COLORS[s]} stopOpacity={0.15} />
              <stop offset="100%" stopColor={SEV_COLORS[s]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Hairline solid grid — never dashed */}
        <CartesianGrid
          strokeDasharray="0"
          stroke="var(--grid-line)"
          vertical={false}
          strokeWidth={1}
        />
        <XAxis
          dataKey="hour"
          tick={{ fill: "var(--axis-text)", fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "var(--axis-text)", fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }} />

        {/* Stack bottom → top: debug, info, warning, error, critical */}
        {presentSeverities.map((s) => (
          <Area
            key={s}
            type="monotone"
            dataKey={s}
            stackId="1"
            stroke={SEV_COLORS[s]}
            strokeWidth={1.5}
            fill={`url(#fill-${s})`}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: SEV_COLORS[s] }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
