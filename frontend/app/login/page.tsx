"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password UI
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  // ✅ show message banner for redirects
  const [banner, setBanner] = useState<string>("");

  // ✅ IMPORTANT: DO NOT auto-redirect if token exists.
  // People may click Login from navbar even if token exists (or token is stale).

  useEffect(() => {
    if (!reason) {
      setBanner("");
      return;
    }
    if (reason === "password_changed") {
      setBanner("✅ Password changed successfully. Please log in again.");
      return;
    }
    if (reason === "session_expired") {
      setBanner("⚠️ Your session expired. Please log in again.");
      return;
    }
    if (reason === "logged_out") {
      setBanner("You have been logged out.");
      return;
    }
    setBanner("");
  }, [reason]);

  const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const canRequestForgot = useMemo(() => emailOk(forgotEmail), [forgotEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setForgotMsg("");

    try {
      const res = await fetch(api("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      window.dispatchEvent(new Event("authChanged"));
      router.refresh();

      // IMPORTANT: if backend says must change password, redirect
      if (data.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/stories");
      }
    } catch (err: any) {
      console.error("Login request failed:", err);
      setError(err?.message || "Network error while logging in");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setForgotLoading(true);
    setForgotMsg("");
    setError("");

    try {
      const res = await fetch(api("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setForgotMsg(data.message || data.error || "Failed to send temporary password.");
        return;
      }

      // Do NOT reveal if email exists (security). Backend should do same.
      setForgotMsg("If that email exists, we’ve sent a temporary password. Check your inbox/spam.");
    } catch (e: any) {
      setForgotMsg(e?.message || "Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="signup-page">
      <div className="signup-shell">
        <div className="signup-grid">
          {/* LEFT: Login Card */}
          <section className="storyverse-card">
            <div className="text-xs uppercase tracking-[0.22em] text-white/70">Storyverse</div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
              Welcome back to <span className="storyverse-accent">your story</span>
            </h1>

            <p className="mt-3 text-sm text-white/70 max-w-md">
              Continue your journey. Your progress, choices, and chapters are waiting.
            </p>

            {/* ✅ Banner for redirects */}
            {banner && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90">
                {banner}
              </div>
            )}

            {error && <div className="mt-6 storyverse-error">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="storyverse-label">Email</label>
                <input
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="storyverse-input"
                  required
                />
              </div>

              <div>
                <label className="storyverse-label">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="storyverse-input"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot((s) => !s);
                    setForgotMsg("");
                    setForgotEmail(email.trim() || "");
                  }}
                  className="text-sm text-emerald-200 hover:text-emerald-100"
                >
                  Forgot password?
                </button>
              </div>

              {/* Forgot password panel */}
              {showForgot && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-sm text-white/80">Enter your email. We’ll send a temporary password.</div>

                  <input
                    type="email"
                    placeholder="you@domain.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="storyverse-input"
                  />

                  <button
                    type="button"
                    onClick={handleForgot}
                    disabled={!canRequestForgot || forgotLoading}
                    className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? "Sending…" : "Send temporary password"}
                  </button>

                  {forgotMsg && <div className="text-sm text-white/80">{forgotMsg}</div>}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full storyverse-btn">
                {loading ? "Logging in…" : "Sign in"}
              </button>

              <div className="text-center text-sm text-white/70">
                New to Storyverse?{" "}
                <a href="/signup" className="font-semibold text-emerald-200 hover:text-emerald-100">
                  Create an account
                </a>
              </div>
            </form>
          </section>

          {/* RIGHT: Reader Panel */}
          <aside className="storyverse-panel relative overflow-hidden hidden lg:block">
            <div className="storyverse-panel-bg absolute inset-0" />
            <div className="relative p-10 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                ✦ Reader’s Note
              </div>

              <h2 className="mt-6 text-4xl font-extrabold leading-tight">
                Stories remember
                <br />
                who you are.
              </h2>

              <p className="mt-4 text-white/75 leading-relaxed max-w-md">
                Every chapter you’ve read, every choice you made — Storyverse picks up exactly where you left off.
              </p>

              <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6">
                <div className="text-white/90 text-lg leading-relaxed">
                  “Coming back felt natural. Like reopening a book I never really closed.”
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Surbhi</div>
                    <div className="text-xs text-white/60">Reader • Drama Path</div>
                  </div>

                  <div className="text-amber-300 text-sm">★★★★★</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
