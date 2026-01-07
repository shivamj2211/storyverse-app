"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "..//lib/api";

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorCode(null);


    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    const ageNum = age ? Number(age) : null;
    if (ageNum && (ageNum < 10 || ageNum > 120)) {
      setError("Age must be between 10 and 120.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(api("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          age: ageNum,
          phone: phone.trim() || null,
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorCode(data.error || null);
        setError(data.message || data.error || "Signup failed.");
        return;
      }

      localStorage.setItem("token", data.token);
      // Notify the app (NavBar and other listeners) that auth state changed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("authChanged"));
      }
      router.push("/stories");
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

 return (
  <main className="signup-page">
    <div className="signup-shell">
      <div className="signup-grid">
        {/* LEFT */}
        <section className="storyverse-card">
          <div className="text-xs uppercase tracking-[0.22em] text-white/70">
            Storyverse
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
            Begin your <span className="storyverse-accent">reading journey</span>
          </h1>

          <p className="mt-3 text-sm text-white/70 max-w-xl">
            Create an account to unlock chapters, save progress, and build your
            personalized story path.
          </p>

          {error && (
  <div className="mt-6 storyverse-error">
    <div>{error}</div>

    {errorCode === "EMAIL_ALREADY_REGISTERED" && (
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
        >
          Go to Login
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setErrorCode(null);
          }}
          className="rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          Try another email
        </button>
      </div>
    )}
  </div>
)}


          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="storyverse-label">First name</label>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="storyverse-input"
                  required
                />
              </div>

              <div>
                <label className="storyverse-label">Last name</label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="storyverse-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="storyverse-label">Age (optional)</label>
              <input
                type="number"
                placeholder="Age (optional)"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="storyverse-input"
              />
            </div>

            <div>
              <label className="storyverse-label">Phone (optional)</label>
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="storyverse-input"
              />
            </div>

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
              {loading ? "Creating…" : "Create Account"}
            </button>

            <div className="text-center text-sm text-white/70">
              Already a reader?{" "}
              <a href="/login" className="font-semibold text-emerald-200">
                Sign in
              </a>
            </div>
          </form>
        </section>

        {/* RIGHT */}
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
                  <div className="text-xs text-white/60">
                    Reader • Mystery Run
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
