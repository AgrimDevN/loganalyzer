const SEV: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: "var(--s-critical)", bg: "rgba(208,59,59,0.10)", border: "rgba(208,59,59,0.22)" },
  error:    { color: "var(--s-error)",    bg: "rgba(224,120,69,0.10)", border: "rgba(224,120,69,0.22)" },
  warning:  { color: "var(--s-warning)",  bg: "rgba(212,149,10,0.10)", border: "rgba(212,149,10,0.22)" },
  info:     { color: "var(--s-info)",     bg: "rgba(57,135,229,0.10)", border: "rgba(57,135,229,0.22)" },
  debug:    { color: "var(--s-debug)",    bg: "rgba(86,102,128,0.10)", border: "rgba(86,102,128,0.22)" },
};

export function SeverityBadge({
  severity,
  size = "sm",
}: {
  severity: string;
  size?: "sm" | "md";
}) {
  const s = SEV[severity.toLowerCase()] ?? SEV.debug;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-medium uppercase tracking-widest ${
        size === "md" ? "px-2 py-[3px] text-[11px]" : "px-[5px] py-[2px] text-[10px]"
      }`}
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {severity.toUpperCase()}
    </span>
  );
}

/* Dot-only variant for tight spaces */
export function SeverityDot({ severity }: { severity: string }) {
  const s = SEV[severity.toLowerCase()] ?? SEV.debug;
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: s.color }}
      title={severity}
    />
  );
}
