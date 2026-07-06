"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, AlertTriangle, LayoutDashboard, Radio, LogOut, User } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/logs", label: "Live Logs", icon: Radio },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
];

interface SidebarProps {
  user: { name: string; email: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col min-h-screen"
      style={{
        background: "var(--bg-base)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Brand */}
      <div
        className="px-4 py-[18px]"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
            }}
          >
            <Activity className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
              LogAnalyzer
            </p>
            <p className="text-[10px] tracking-wide mt-[1px]" style={{ color: "var(--text-3)" }}>
              AI Log Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-3 pb-2">
        <p
          className="px-3 mb-2 text-[10px] font-medium uppercase tracking-widest"
          style={{ color: "var(--text-3)" }}
        >
          Navigation
        </p>
        <div className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="relative flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all duration-150"
                style={
                  active
                    ? { background: "var(--accent-dim)", color: "var(--text-1)" }
                    : { color: "var(--text-2)" }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                  }
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-sm"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <Icon className="w-[15px] h-[15px] shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Status */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: "#0ca30c" }} />
          <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
            All systems operational
          </span>
        </div>
      </div>

      {/* User + logout */}
      <div
        className="px-3 py-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {user && (
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent)" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium truncate" style={{ color: "var(--text-1)" }}>
                {user.name}
              </p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-3)" }}>
                {user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-[12px] font-medium transition-all"
          style={{ color: "var(--text-2)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
            (e.currentTarget as HTMLElement).style.color = "var(--s-critical)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
          }}
        >
          <LogOut className="w-[14px] h-[14px] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
