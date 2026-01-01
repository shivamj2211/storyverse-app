"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "..//lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("API:", api("/api/auth/login"));
      const res = await fetch(api("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("authChanged"));
        router.push("/stories");
      }
    } catch (err: any) {
  console.error("Login request failed:", err);
  setError(err?.message || "Network error while logging in");
} finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup-page">
      <div className="signup-shell">
        <div className="signup-grid">
          {/* LEFT: Login Card */}
          <section className="storyverse-card">
            <div className="text-xs uppercase tracking-[0.22em] text-white/70">
              Storyverse
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
              Welcome back to{" "}
              <span className="storyverse-accent">your story</span>
            </h1>

            <p className="mt-3 text-sm text-white/70 max-w-md">
              Continue your journey. Your progress, choices, and chapters are
              waiting.
            </p>

            {error && (
              <div className="mt-6 storyverse-error">{error}</div>
            )}

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

              <button
                type="submit"
                disabled={loading}
                className="w-full storyverse-btn"
              >
                {loading ? "Logging in…" : "Sign in"}
              </button>

              <div className="text-center text-sm text-white/70">
                New to Storyverse?{" "}
                <a
                  href="/signup"
                  className="font-semibold text-emerald-200 hover:text-emerald-100"
                >
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
                Every chapter you’ve read, every choice you made — Storyverse
                picks up exactly where you left off.
              </p>

              <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6">
                <div className="text-white/90 text-lg leading-relaxed">
                  “Coming back felt natural. Like reopening a book I never
                  really closed.”
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Meera</div>
                    <div className="text-xs text-white/60">
                      Reader • Drama Path
                    </div>
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
