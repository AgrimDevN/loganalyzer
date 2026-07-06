import Link from "next/link";
import { Activity, Zap, ShieldCheck, BarChart3, ArrowRight, Radio } from "lucide-react";

const DEMO_LOGS = [
  { time: "14:32:01", sev: "critical", svc: "payment-service",  msg: "Database connection pool exhausted — 0 idle connections" },
  { time: "14:32:00", sev: "error",    svc: "auth-service",     msg: "JWT token validation failed: signature mismatch" },
  { time: "14:31:59", sev: "warning",  svc: "api-gateway",      msg: "Rate limit threshold reached: 85% capacity" },
  { time: "14:31:58", sev: "info",     svc: "user-service",     msg: "Session created for user usr_9x2k4mw" },
  { time: "14:31:57", sev: "error",    svc: "payment-service",  msg: "Transaction rollback: constraint violation on orders" },
  { time: "14:31:56", sev: "info",     svc: "notification-svc", msg: "Email dispatched to 3 subscribers successfully" },
  { time: "14:31:55", sev: "critical", svc: "payment-service",  msg: "Circuit breaker OPEN — downstream service timeout" },
  { time: "14:31:54", sev: "warning",  svc: "cache-service",    msg: "Cache hit rate dropped below 60% — potential miss storm" },
];

const SEV_COLOR: Record<string, string> = {
  critical: "#d03b3b", error: "#e07845", warning: "#d4950a", info: "#3987e5",
};

const FEATURES = [
  {
    icon: Radio,
    title: "Real-time ingestion",
    desc: "Every log line captured and stored with vector embeddings — zero buffering, zero loss.",
  },
  {
    icon: Zap,
    title: "AI-powered analysis",
    desc: "Three-agent CrewAI pipeline correlates events, identifies root causes, and generates structured reports.",
  },
  {
    icon: ShieldCheck,
    title: "Instant incident alerts",
    desc: "Debounced detection fires once per incident window — one alert, not a storm.",
  },
  {
    icon: BarChart3,
    title: "Visual intelligence",
    desc: "Live log volume charts, severity breakdowns, and full incident timelines in one dashboard.",
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Grid texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-1) 1px, transparent 1px), linear-gradient(90deg, var(--text-1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Navbar ── */}
      <nav
        className="relative z-10 flex items-center justify-between px-8 py-4 border-b"
        style={{ borderColor: "var(--border-subtle)", background: "rgba(9,13,22,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
            LogAnalyzer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-medium px-4 py-1.5 rounded-lg transition-all"
            style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-[13px] font-medium px-4 py-1.5 rounded-lg transition-all"
            style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center pt-24 pb-16 px-6">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-widest mb-8"
          style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          AI-Powered Log Intelligence
        </div>

        {/* Headline */}
        <h1 className="text-[52px] md:text-[64px] font-bold tracking-tight leading-[1.08] max-w-3xl mb-6">
          <span style={{ color: "var(--text-1)" }}>Your logs,</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, var(--text-1) 0%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            understood instantly.
          </span>
        </h1>

        {/* Subtext */}
        <p
          className="text-[16px] leading-relaxed max-w-xl mb-10"
          style={{ color: "var(--text-2)" }}
        >
          LogAnalyzer ingests your system logs in real time, runs a three-agent AI
          pipeline to detect incidents and identify root causes, then surfaces
          actionable reports — before on-call gets paged.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold transition-all"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all"
            style={{ color: "var(--text-2)", border: "1px solid var(--border)", background: "var(--bg-surface)" }}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Demo terminal ── */}
      <section className="relative z-10 px-6 pb-16 max-w-4xl mx-auto w-full">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: "1px solid var(--border)",
            boxShadow: "0 0 60px rgba(57,135,229,0.06), 0 24px 48px rgba(0,0,0,0.4)",
          }}
        >
          {/* Terminal titlebar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: "#d03b3b" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#d4950a" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#0ca30c" }} />
            <div className="flex-1 flex justify-center">
              <div
                className="flex items-center gap-2 px-3 py-1 rounded text-[11px]"
                style={{ background: "var(--bg-base)", color: "var(--text-3)" }}
              >
                <Radio className="w-3 h-3" style={{ color: "#0ca30c" }} />
                Live Log Stream — production
              </div>
            </div>
          </div>

          {/* Log rows */}
          <div style={{ background: "var(--bg-surface)" }}>
            {DEMO_LOGS.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2 text-[12px]"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  opacity: 1 - i * 0.06,
                }}
              >
                <span className="w-[3px] self-stretch rounded-r-sm shrink-0"
                  style={{ background: SEV_COLOR[log.sev] ?? "#566680", opacity: 0.7 }} />
                <span className="tabular-nums w-16 shrink-0" style={{ color: "var(--text-3)" }}>
                  {log.time}
                </span>
                <span
                  className="shrink-0 px-1.5 py-px rounded text-[10px] uppercase tracking-wider border"
                  style={{
                    color: SEV_COLOR[log.sev] ?? "#566680",
                    background: `${SEV_COLOR[log.sev]}18`,
                    borderColor: `${SEV_COLOR[log.sev]}33`,
                  }}
                >
                  {log.sev}
                </span>
                <span className="shrink-0 w-36 truncate" style={{ color: "var(--accent)" }}>
                  {log.svc}
                </span>
                <span className="truncate" style={{ color: "var(--text-2)" }}>
                  {log.msg}
                </span>
              </div>
            ))}
          </div>

          {/* AI analysis bar */}
          <div
            className="flex items-center gap-3 px-4 py-2.5"
            style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" style={{ color: "var(--s-warning)" }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--s-warning)" }}>
                Incident detected
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
              AI crew triggered · Root cause: payment-service DB pool exhausted · 3 LLM calls
            </span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto w-full">
        <p
          className="text-center text-[11px] font-semibold uppercase tracking-widest mb-8"
          style={{ color: "var(--text-3)" }}
        >
          What it does
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl p-5"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <p className="text-[14px] font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                {title}
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-3)" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto w-full">
        <div
          className="rounded-2xl px-8 py-10 text-center"
          style={{
            background: "linear-gradient(135deg, var(--bg-elevated) 0%, rgba(57,135,229,0.06) 100%)",
            border: "1px solid var(--accent-border)",
          }}
        >
          <h2 className="text-[24px] font-bold mb-3" style={{ color: "var(--text-1)" }}>
            Ready to monitor smarter?
          </h2>
          <p className="text-[14px] mb-6" style={{ color: "var(--text-2)" }}>
            Free to use. No credit card required. Deploy in under 5 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-[14px] font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Create free account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 mt-auto px-8 py-5 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span className="text-[12px] font-medium" style={{ color: "var(--text-3)" }}>
            LogAnalyzer
          </span>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
          AI-powered log intelligence platform
        </p>
      </footer>
    </div>
  );
}
