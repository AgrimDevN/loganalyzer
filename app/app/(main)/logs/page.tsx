import { LogFeed } from "@/components/LogFeed";

export const dynamic = "force-dynamic";

export default function LogsPage() {
  return (
    <div className="flex flex-col h-screen">
      <div
        className="px-7 py-4 shrink-0"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <h1 className="text-[15px] font-semibold" style={{ color: "var(--text-1)" }}>
          Live Logs
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
          Real-time event stream · filter by severity · pause to buffer
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <LogFeed />
      </div>
    </div>
  );
}
