"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

function scorePassword(pw: string) {
  // Simple strength scoring (0-4)
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function validateStrongPassword(pw: string) {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/\d/.test(pw)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a symbol.";
  if (/(password|123456|qwerty|admin|letmein|111111)/i.test(pw))
    return "Password is too common.";
  return null;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6A2.5 2.5 0 0 0 13.4 13.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.3 5.4A10.3 10.3 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-4.3 5.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.1 6.1C3.6 8.1 2 12 2 12s3.5 7 10 7c1 0 2-.2 2.9-.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<string>("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pwRuleError = useMemo(() => validateStrongPassword(password), [password]);
  const pwScore = useMemo(() => scorePassword(password), [password]);

  const confirmMismatch = useMemo(() => {
    if (!confirmPassword) return false;
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  const canSubmit = useMemo(() => {
    if (!first_name.trim()) return false;
    if (!last_name.trim()) return false;
    if (!email.trim()) return false;
    if (!password) return false;
    if (!!pwRuleError) return false;
    if (!confirmPassword) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [first_name, last_name, email, password, confirmPassword, pwRuleError]);

  const strengthLabel = useMemo(() => {
    if (!password) return "Enter a password";
    if (pwScore <= 1) return "Weak";
    if (pwScore === 2) return "Okay";
    if (pwScore === 3) return "Strong";
    return "Very strong";
  }, [pwScore, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch(api("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          age: age ? Number(age) : null,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || data.error || "Signup failed");
        return;
      }

      // Store token and go to stories (or you can go to /verify-email message page)
      if (data.token) {
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("authChanged"));
      }

      router.push("/stories");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup-page">
      <div className="signup-shell">
        <div className="signup-grid">
          <section className="storyverse-card">
            <div className="text-xs uppercase tracking-[0.22em] text-white/70">
              Storyverse
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
              Create your <span className="storyverse-accent">account</span>
            </h1>

            <p className="mt-3 text-sm text-white/70 max-w-md">
              Start reading, choosing, and continuing your journey.
            </p>

            {error && <div className="mt-6 storyverse-error">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="storyverse-label">First name</label>
                  <input
                    value={first_name}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="storyverse-input"
                    placeholder="Shivam"
                    required
                  />
                </div>

                <div>
                  <label className="storyverse-label">Last name</label>
                  <input
                    value={last_name}
                    onChange={(e) => setLastName(e.target.value)}
                    className="storyverse-input"
                    placeholder="Jaiswal"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="storyverse-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="storyverse-input"
                  placeholder="you@domain.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="storyverse-label">Phone (optional)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="storyverse-input"
                    placeholder="9876543210"
                  />
                </div>

                <div>
                  <label className="storyverse-label">Age (optional)</label>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, ""))}
                    className="storyverse-input"
                    placeholder="22"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="storyverse-label">Password</label>

                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="storyverse-input pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>

                {/* Strength Meter */}
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/70">Strength</div>
                    <div className="text-xs font-semibold text-white/85">
                      {strengthLabel}
                    </div>
                  </div>

                  <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{
                        width:
                          password.length === 0
                            ? "0%"
                            : pwScore === 0
                            ? "20%"
                            : pwScore === 1
                            ? "35%"
                            : pwScore === 2
                            ? "55%"
                            : pwScore === 3
                            ? "75%"
                            : "100%",
                      }}
                    />
                  </div>

                  {/* Rules hint */}
                  <div className="mt-2 text-xs text-white/65 leading-relaxed">
                    Must include: <b>8+</b> chars, <b>upper</b>, <b>lower</b>, <b>number</b>, <b>symbol</b>.
                  </div>

                  {pwRuleError && (
                    <div className="mt-2 text-xs font-semibold text-amber-200">
                      {pwRuleError}
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="storyverse-label">Confirm password</label>

                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="storyverse-input pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>

                {confirmMismatch && (
                  <div className="mt-2 text-xs font-semibold text-red-300">
                    Passwords do not match.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full storyverse-btn disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>

              <div className="text-center text-sm text-white/70">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="font-semibold text-emerald-200 hover:text-emerald-100"
                >
                  Sign in
                </a>
              </div>
            </form>
          </section>

          {/* RIGHT: panel optional (keep your existing if you have) */}
           <aside className="storyverse-panel relative overflow-hidden hidden lg:block">
            <div className="storyverse-panel-bg absolute inset-0" />
            <div className="relative p-10 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
                ✦ Reader’s Note
              </div>

              <h2 className="mt-6 text-4xl font-extrabold leading-tight">
                Every choice
                <br />
                writes you back.
              </h2>

              <p className="mt-4 text-white/75 leading-relaxed max-w-md">
                Calm colors. Clear typography. Built for long reading sessions —
                the UI stays quiet, your story stays loud.
              </p>

              <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6">
                <div className="text-white/90 text-lg leading-relaxed">
                  “I opened one chapter… and suddenly it was 3 AM. The story felt
                  like it was reacting to me.”
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Satyendra</div>
                    <div className="text-xs text-white/60">Reader • Mystery Run</div>
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
