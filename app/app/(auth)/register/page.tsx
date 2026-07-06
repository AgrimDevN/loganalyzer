"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-all";
  const inputStyle = { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" };
  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = "var(--accent)";
      e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-dim)";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = "var(--border)";
      e.currentTarget.style.boxShadow = "none";
    },
  };

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)" }}
        >
          <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="text-[22px] font-bold" style={{ color: "var(--text-1)" }}>
          Create your account
        </h1>
        <p className="text-[13px] mt-1.5" style={{ color: "var(--text-2)" }}>
          Start monitoring your logs with AI intelligence
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-7"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Chen"
              required
              autoComplete="name"
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
              Password
              <span className="ml-1.5 font-normal" style={{ color: "var(--text-3)" }}>
                (min. 8 characters)
              </span>
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className={`${inputClass} pr-10`}
                style={inputStyle}
                {...focusHandlers}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-3)" }}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-[12px]"
              style={{ background: "rgba(208,59,59,0.08)", border: "1px solid rgba(208,59,59,0.2)", color: "var(--s-critical)" }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity mt-1"
            style={{ background: "var(--accent)", color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Create account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-center leading-relaxed" style={{ color: "var(--text-3)" }}>
            By creating an account you agree to our terms of service.
          </p>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-[13px] mt-5" style={{ color: "var(--text-2)" }}>
        Already have an account?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>
          Sign in
        </Link>
      </p>
      <p className="text-center text-[13px] mt-2">
        <Link href="/" className="text-[12px]" style={{ color: "var(--text-3)" }}>
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
