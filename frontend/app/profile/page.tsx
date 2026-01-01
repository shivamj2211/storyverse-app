"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "../lib/api";
import CoinsWallet from "../../components/CoinsWallet";

type MePayload = {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    phone?: string | null;
    age?: number | null;
    plan?: "free" | "premium" | "creator";
    coins?: number;
    is_admin?: boolean;
    is_premium?: boolean;
  };
};

type RunItem = {
  id: string;
  storyTitle: string;
  isCompleted: boolean;
  startedAt: string;
  updatedAt: string;
};

type RunsResponse = { runs: RunItem[] };

type CoinSummaryResponse = {
  available: number;
  used: number;
};

type CoinHistoryItem = {
  id: string;
  type: "redeem" | "earn" | "adjust";
  coins: number;
  story_title?: string | null; // for redeem
  chapter_number?: number | null; // for redeem
  note?: string | null; // for earn source too
  created_at: string; // ISO
};
function formatPhone(p?: string | null) {
  if (!p) return "—";
  const s = String(p).trim();
  return s.length ? s : "—";
}
function formatAge(a?: number | null) {
  if (typeof a !== "number" || !Number.isFinite(a) || a <= 0) return "—";
  return String(Math.floor(a));
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function addYears(iso: string, years: number) {
  try {
    const d = new Date(iso);
    d.setFullYear(d.getFullYear() + years);
    return d;
  } catch {
    return null;
  }
}

function daysLeft(expiry: Date) {
  const ms = expiry.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function displayNameFromEmail(email?: string) {
  if (!email) return "User";
  const local = email.split("@")[0] || email;
  return local.slice(0, 1).toUpperCase() + local.slice(1);
}

function initialsFromEmail(email?: string) {
  if (!email) return "U";
  const local = email.split("@")[0] || "U";
  const first = local[0] || "U";
  const second = local[1] || "";
  return (first + second).toUpperCase();
}

function safeBool(v: any) {
  return !!v;
}

function resolvePlan(u: MePayload["user"]): "free" | "premium" | "creator" {
  if (u.plan === "premium" || u.plan === "creator" || u.plan === "free") return u.plan;
  return u.is_premium ? "premium" : "free";
}

/** Wallet helpers */
const COIN_UNLOCK_THRESHOLD = 20;
const COIN_EXPIRY_YEARS = 1;

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hintText(plan: "free" | "premium" | "creator", availableCoins: number) {
  if (plan !== "free") return "You’re on a paid plan — coin gates are bypassed. Coins still track your activity.";
  if (availableCoins <= 0) return "Earn your first coins by rating a journey — then unlock Chapter 3+.";
  if (availableCoins < COIN_UNLOCK_THRESHOLD)
    return `You’re close. Earn ${COIN_UNLOCK_THRESHOLD - availableCoins} more coin(s) to unlock Chapter 3+.`;
  return "You have enough coins! You can unlock Chapter 3+ anytime.";
}

function activityTitle(h: { type: string; story_title?: string | null; chapter_number?: number | null; note?: string | null }) {
  const story = h.story_title || "Unknown story";
  const chap = typeof h.chapter_number === "number" ? ` • Chapter ${h.chapter_number}` : "";
  if (h.type === "redeem") return `Unlocked with coins • ${story}${chap}`;
  if (h.type === "earn") return h.note ? `Earned coins • ${h.note}` : "Earned coins";
  return h.note ? `Coin update • ${h.note}` : "Coin update";
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [me, setMe] = useState<MePayload["user"] | null>(null);
  const [runs, setRuns] = useState<RunItem[]>([]);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getToken();
  }, []);

  const [coinSummary, setCoinSummary] = useState<CoinSummaryResponse | null>(null);

  // Separate modals
  const [earnOpen, setEarnOpen] = useState(false); // top-right View Details
  const [useOpen, setUseOpen] = useState(false); // Used Details

  // Account modals
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [acctLoading, setAcctLoading] = useState(false);
  const [acctErr, setAcctErr] = useState<string | null>(null);

  // Separate datasets
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnErr, setEarnErr] = useState<string | null>(null);
  const [earnedHistory, setEarnedHistory] = useState<CoinHistoryItem[]>([]);

  const [useLoading, setUseLoading] = useState(false);
  const [useErr, setUseErr] = useState<string | null>(null);
  const [usedHistory, setUsedHistory] = useState<CoinHistoryItem[]>([]);
  type ThemePref = "system" | "light" | "dark";

const [themePref, setThemePref] = useState<ThemePref>("system");
const [hideEmail, setHideEmail] = useState(false);
const [autoScroll, setAutoScroll] = useState(false);
const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  if (typeof window === "undefined") return;
  setThemePref((localStorage.getItem("sv_theme") as ThemePref) || "system");
  setHideEmail(localStorage.getItem("sv_hide_email") === "1");
  setAutoScroll(localStorage.getItem("sv_autoscroll") === "1");
  setReduceMotion(localStorage.getItem("sv_reduce_motion") === "1");
}, []);

useEffect(() => {
  if (typeof window === "undefined") return;

  localStorage.setItem("sv_theme", themePref);
  localStorage.setItem("sv_hide_email", hideEmail ? "1" : "0");
  localStorage.setItem("sv_autoscroll", autoScroll ? "1" : "0");
  localStorage.setItem("sv_reduce_motion", reduceMotion ? "1" : "0");

  // Apply theme (Tailwind dark mode expects class "dark" on html)
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  const shouldDark = themePref === "dark" ? true : themePref === "light" ? false : prefersDark;
  root.classList.toggle("dark", shouldDark);

  // Optional: reduce motion hook for your UI
  root.classList.toggle("sv-reduce-motion", reduceMotion);
}, [themePref, hideEmail, autoScroll, reduceMotion]);

  async function fetchCoinSummary() {
    try {
      const res = await fetch(api("/api/coins/summary"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as CoinSummaryResponse;
      setCoinSummary(data);
    } catch {
      // ignore
    }
  }

  async function fetchEarnedHistory() {
    setEarnErr(null);
    setEarnLoading(true);
    try {
      // preferred:
      // GET /api/coins/history?type=earn
      const res = await fetch(api("/api/coins/history?type=earn"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });

      if (!res.ok) {
        setEarnErr("Unable to load earned coin history.");
        return;
      }

      const raw = await res.json();
      const items = Array.isArray(raw) ? raw : raw.items;
      const all = (items || []) as CoinHistoryItem[];

      // fallback filtering (if backend ignores query params)
      setEarnedHistory(all.filter((x) => x.type === "earn" || x.type === "adjust"));
    } catch {
      setEarnErr("Network error while loading earned history.");
    } finally {
      setEarnLoading(false);
    }
  }

  async function fetchUsedHistory() {
    setUseErr(null);
    setUseLoading(true);
    try {
      // preferred:
      // GET /api/coins/history?type=redeem
      const res = await fetch(api("/api/coins/history?type=redeem"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });

      if (!res.ok) {
        setUseErr("Unable to load usage history.");
        return;
      }

      const raw = await res.json();
      const items = Array.isArray(raw) ? raw : raw.items;
      const all = (items || []) as CoinHistoryItem[];

      // fallback filtering (if backend ignores query params)
      setUsedHistory(all.filter((x) => x.type === "redeem"));
    } catch {
      setUseErr("Network error while loading usage history.");
    } finally {
      setUseLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const meRes = await fetch(api("/api/auth/me"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });
        const meData = (await meRes.json().catch(() => ({}))) as MePayload;
        if (!meRes.ok) {
          setErr((meData as any)?.error || "Unable to load profile");
          setLoading(false);
          return;
        }
        setMe(meData.user);

        // prefill edit fields
        setEditFullName(meData.user?.full_name || "");
        setEditPhone(meData.user?.phone || "");

        await fetchCoinSummary();

        // load earned list for "Recent activity" + progress UX
        await fetchEarnedHistory();
        await fetchUsedHistory();

        const runsRes = await fetch(api("/api/runs"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });
        const runsData = (await runsRes.json().catch(() => ({}))) as RunsResponse;
        setRuns(runsRes.ok ? runsData.runs || [] : []);
      } catch {
        setErr("Unable to load profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const stats = useMemo(() => {
    const total = runs.length;
    const completed = runs.filter((r) => r.isCompleted).length;
    const inProgress = total - completed;
    return { total, completed, inProgress };
  }, [runs]);

  if (!token) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">
            <div className="parchment-kicker">Profile</div>
            <div className="parchment-h1">You’re not logged in</div>
            <p className="parchment-sub">Please log in to view your profile.</p>

            <div className="primary-actions">
              <button className="btn-primary" onClick={() => router.push("/login")}>
                Go to Login
              </button>
              <Link className="btn-ghost" href="/stories">
                Browse Stories
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">Loading profile…</div>
        </div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">
            <div className="parchment-kicker">Profile</div>
            <div className="parchment-h1">Something went wrong</div>
            <p className="parchment-sub">{err}</p>

            <div className="primary-actions">
              <button className="btn-primary" onClick={() => router.refresh()}>
                Refresh
              </button>
              <Link className="btn-ghost" href="/stories">
                Stories
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">No profile data.</div>
        </div>
      </main>
    );
  }

  const plan = resolvePlan(me);
  const coins = Number.isFinite(Number(me.coins)) ? Number(me.coins) : 0;
  const isAdmin = safeBool(me.is_admin);

  const availableCoins = coinSummary?.available ?? coins;
  const usedCoins = coinSummary?.used ?? 0;

  const progress = clamp01(availableCoins / COIN_UNLOCK_THRESHOLD);
  const progressPct = Math.round(progress * 100);

  const smartHint = hintText(plan, availableCoins);

  // Recent activity: prefer showing earned + used mixed, but your request says recent activity last 3 (earned is ok too).
  const mergedRecent = [...(earnedHistory || []), ...(usedHistory || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Account update helpers
  async function saveProfileChanges() {
    setAcctErr(null);
    setAcctLoading(true);
    try {
      const res = await fetch(api('/api/auth/me'), {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: editFullName || null, phone: editPhone || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAcctErr(data.error || 'Unable to save profile');
        return;
      }
      setMe(data.user);
      setEditOpen(false);
      // notify other UI
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('authChanged'));
    } catch (e) {
      setAcctErr('Network error');
    } finally {
      setAcctLoading(false);
    }
  }

  async function submitEmailChange() {
    setAcctErr(null);
    setAcctLoading(true);
    try {
      const res = await fetch(api('/api/auth/me/email'), {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: emailPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAcctErr(data.error || 'Unable to change email');
        return;
      }
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setMe(data.user || me);
      setEmailOpen(false);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('authChanged'));
    } catch (e) {
      setAcctErr('Network error');
    } finally {
      setAcctLoading(false);
    }
  }

  async function submitPasswordChange() {
    setAcctErr(null);
    setAcctLoading(true);
    try {
      const res = await fetch(api('/api/auth/me/password'), {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAcctErr(data.error || 'Unable to change password');
        return;
      }
      setPassOpen(false);
      // show success briefly
    } catch (e) {
      setAcctErr('Network error');
    } finally {
      setAcctLoading(false);
    }
  }

  return (
    <main className="parchment-wrap">
      <div className="parchment-shell-wide space-y-6">
        <div className="parchment-panel">
          <div className="parchment-kicker">Profile</div>
          <div className="parchment-h1">
            Hi, <span className="parchment-accent">{displayNameFromEmail(me.email)}</span>
          </div>
          <p className="parchment-sub">View your account status, coins, and reading progress.</p>

          <div className="tab-row">
            <Link className="tab-btn" href="/stories">Stories</Link>
            <Link className="tab-btn" href="/saved">Saved</Link>
            <Link className="tab-btn" href="/runs">Continue Reading</Link>
            
          </div>

          <div className="hr-ink" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Profile summary card (left, larger) */}
            {/* Profile summary card (clean identity card) */}
          <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white/70 p-6">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-2xl font-extrabold text-emerald-700">
                {me.email ? initialsFromEmail(me.email) : "U"}
              </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-500 uppercase tracking-[0.22em]">Account</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 truncate">
              {me.full_name || displayNameFromEmail(me.email)}
            </div>

          {/* Labeled grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
              <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-600/80">Full name</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                {me.full_name || "—"}
              </div>
            </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-600/80">Email</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
            {hideEmail ? "Hidden" : (me.email || "—")}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-600/80">Phone</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
            {formatPhone(me.phone)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-600/80">Age</div>
          <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
            {formatAge(me.age)}
          </div>
        </div>
      </div>

      {/* Actions */}
      
    </div>
  </div>
</div>


            {/* Compact stats (right) */}
            <div className="md:col-span-1 space-y-4">
              <div className="stat-card">
                <div className="stat-label">Plan</div>
                <div className="stat-value">{plan === "creator" ? "Creator" : plan === "premium" ? "Premium" : "Free"}</div>
                <div className="stat-note">{plan === "free" ? "Upgrade to unlock replay & more." : "Enjoy your benefits."}</div>
                <Link className="tab-btn tab-btn-primary" href="/premium">Upgrade</Link>
              </div>

              <div className="stat-card">
                <div className="stat-label">Role</div>
                <div className="stat-value">{isAdmin ? "Admin" : "Reader"}</div>
                <div className="stat-note">{isAdmin ? "You have admin access." : "Standard user access."}</div>
              </div>
            </div>
          </div>


               {/* Account actions */}
          <div className="parchment-panel mt-4">
            <div className="parchment-kicker">Account</div>
            <div className="parchment-h1">Manage your account</div>
            <p className="parchment-sub">Change name, phone, email or password.</p>

            <div className="mt-4 flex gap-2">
              <button className="btn-primary" onClick={() => { setEditFullName(me.full_name || ""); setEditPhone(me.phone || ""); setEditOpen(true); }}>
                Edit profile
              </button>
              <button className="btn-ghost" onClick={() => { setNewEmail(me.email || ""); setEmailPassword(""); setEmailOpen(true); }}>
                Change email
              </button>
              <button className="btn-ghost" onClick={() => { setCurrentPassword(""); setNewPassword(""); setPassOpen(true); }}>
                Change password
              </button>
            </div>
          </div>
        </div>
          {/* Coins Wallet */}
          {/* Coins quick section (separate from stat cards) */}
<div className="parchment-panel mt-4">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      <div className="parchment-kicker">Coins</div>
      <div className="parchment-h1" style={{ fontSize: 22 }}>
        Available Coins
      </div>
      <p className="parchment-sub">
        Your total available coins. Use them to unlock Chapter 3+ (free users).
      </p>
    </div>

    <div className="flex items-center gap-3">
      <div className="h-11 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4">
        <span className="text-sm font-semibold text-slate-700/70">Total</span>
        <span className="min-w-[28px] text-right text-lg font-extrabold text-slate-900">
          {coins}
        </span>
        <span className="text-sm text-slate-700/70">🪙</span>
      </div>

      <button
        type="button"
        className="h-11 inline-flex items-center justify-center rounded-2xl px-6 text-sm font-extrabold text-white shadow-sm
                   bg-gradient-to-r from-emerald-700 to-amber-700 hover:opacity-95"
        onClick={() => router.push("/wallet")}
      >
        Open Wallet
      </button>
    </div>
  </div>

  <div className="hr-ink" />

  {/* How to earn coins (compact + nice) */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
      <div className="text-sm font-extrabold text-slate-900">How to earn coins</div>

      <ul className="mt-3 space-y-2 text-sm text-slate-700/80">
        <li>✅ Rate a journey after reading</li>
        <li>✅ Complete stories & earn rewards</li>
        <li>✅ Replays may also reward coins</li>
      </ul>

      <div className="mt-4 text-[11px] text-slate-700/70">
        Tip: Open Wallet to see earning history + expiry.
      </div>
    </div>

    {/* Quick rule */}
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
      <div className="text-sm font-extrabold text-slate-900">Unlock rule</div>
      <p className="mt-2 text-sm text-slate-700/80">
        Free users unlock Chapter 3+ at <b className="text-slate-900">20 coins</b>.
      </p>
      <div className="mt-4 flex gap-2">
        <Link className="btn-ghost" href="/stories">Browse</Link>
        <Link className="btn-ghost" href="/premium">Upgrade</Link>
      </div>
    </div>

    {/* Small CTA */}
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white/80 to-white/40 p-4">
      <div className="text-sm font-extrabold text-slate-900">Wallet includes</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-700/80">
        <li>✅ Earned coins details</li>
        <li>✅ Expiry (1 year)</li>
        <li>✅ Redeem/usage history</li>
      </ul>
      <button
        type="button"
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
        onClick={() => router.push("/wallet")}
      >
        View Wallet Details
      </button>
    </div>
  </div>
</div>

          {/* <CoinsWallet plan={plan} fallbackCoins={coins} /> */}


          {/* Reading stats */}
          <div className="callout-box">
            <div className="callout-title">Reading stats</div>
            <div className="callout-text">
              <b>Total runs:</b> {stats.total} &nbsp;•&nbsp;
              <b>Completed:</b> {stats.completed} &nbsp;•&nbsp;
              <b>In progress:</b> {stats.inProgress}
            </div>

            <div className="primary-actions">
              <Link className="btn-primary" href="/runs">Open Library</Link>
              {plan === "free" ? (
                <Link className="btn-ghost" href="/premium">Upgrade</Link>
              ) : (
                <Link className="btn-ghost" href="/stories">Pick New Story</Link>
              )}
            </div>
          </div>

       

              {/* Settings */}
<div className="parchment-panel mt-4">
  <div className="parchment-kicker">Settings</div>
  <div className="parchment-h1">App preferences</div>
  <p className="parchment-sub">Personalize your reading experience.</p>

  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Theme */}
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
      <div className="text-sm font-extrabold text-slate-900">Theme</div>
      <p className="mt-1 text-sm text-slate-700/80">Choose how Storyverse looks.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["system", "light", "dark"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`rounded-2xl border px-4 py-2 text-sm font-bold ${
              themePref === v ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-900"
            }`}
            onClick={() => setThemePref(v)}
          >
            {v === "system" ? "System" : v === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
    </div>

    {/* Reader options */}
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
      <div className="text-sm font-extrabold text-slate-900">Reader</div>
      <p className="mt-1 text-sm text-slate-700/80">Small switches that improve comfort.</p>

      <div className="mt-3 space-y-3">
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Auto scroll</div>
            <div className="text-xs text-slate-700/70">Helpful for long chapters.</div>
          </div>
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Reduce motion</div>
            <div className="text-xs text-slate-700/70">Less animation and movement.</div>
          </div>
          <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Hide email on profile</div>
            <div className="text-xs text-slate-700/70">Prevents showing it on screen.</div>
          </div>
          <input type="checkbox" checked={hideEmail} onChange={(e) => setHideEmail(e.target.checked)} />
        </label>
      </div>
    </div>
  </div>

  <div className="hr-ink" />

  <div className="flex flex-wrap gap-2">
    <button
      className="btn-ghost"
      onClick={() => {
        localStorage.removeItem("token");
        if (typeof window !== "undefined") window.dispatchEvent(new Event("authChanged"));
        router.push("/login");
      }}
    >
      Logout
    </button>
  </div>
</div>

        {/* Latest journeys */}
        <div className="parchment-panel">
          <div className="parchment-kicker">Recent</div>
          <div className="parchment-h1" style={{ fontSize: 22 }}>Your latest journeys</div>
          <p className="parchment-sub">Quick access to your recent runs.</p>

          {runs.length === 0 ? (
            <div className="parchment-note">No runs yet. Start a story from Stories.</div>
          ) : (
            <div className="space-y-3">
              {runs.slice(0, 5).map((r) => (
                <div key={r.id} className="run-card">
                  <div className="run-head">
                    <div className="min-w-0">
                      <div className="run-title">{r.storyTitle}</div>
                      <div className="run-meta">
                        Status: <b>{r.isCompleted ? "Completed" : "In Progress"}</b>
                        <br />
                        Updated: <b>{new Date(r.updatedAt).toLocaleString()}</b>
                      </div>
                    </div>

                    <div className="run-badges">
                      {r.isCompleted && <span className="badge-sealed">✅ Sealed</span>}
                      <button className="btn-primary" onClick={() => router.push(`/read/${r.id}`)}>
                        {r.isCompleted ? "Explore" : "Resume"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="primary-actions">
            <Link className="btn-ghost" href="/runs">View all runs</Link>
          </div>
        </div>
      </div>

      {/* ===== MODAL 1: EARNED COINS DETAILS (Top View Details) ===== */}
      {earnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setEarnOpen(false)}>
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">Earned Coins</div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Earning history & expiry</h3>
                <p className="mt-1 text-sm text-slate-700/80">
                  Each earned coin expires after {COIN_EXPIRY_YEARS} year(s) from the earning date.
                </p>
              </div>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => setEarnOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {earnLoading && (
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">Loading earned history…</div>
              )}

              {!earnLoading && earnErr && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{earnErr}</div>
              )}

              {!earnLoading && !earnErr && earnedHistory.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">
                  No earned coin entries yet.
                </div>
              )}

              {!earnLoading && !earnErr && earnedHistory.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="max-h-[420px] overflow-auto bg-white">
                    {earnedHistory.map((h) => {
                      const earnedAt = new Date(h.created_at);
                      const expiry = addYears(h.created_at, COIN_EXPIRY_YEARS);
                      const left = expiry ? daysLeft(expiry) : null;

                      const source = h.note || (h.type === "adjust" ? "Admin adjustment" : "Earned reward");

                      return (
                        <div key={h.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900">
                                +{Math.abs(h.coins)} 🪙 <span className="text-slate-700/70 font-semibold">• {source}</span>
                              </div>
                              <div className="mt-1 text-sm text-slate-700/80">
                                <b>Earned:</b> {fmtDateTime(earnedAt.toISOString())}
                              </div>

                              {expiry && (
                                <div className="mt-1 text-sm text-slate-700/80">
                                  <b>Expires:</b> {expiry.toLocaleDateString()}{" "}
                                  {typeof left === "number" && (
                                    <span className="text-slate-900/70 font-semibold">
                                      • {left <= 0 ? "Expired" : `${left} day(s) left`}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 text-xs font-semibold text-slate-700/70">
                              {h.type === "earn" ? "EARN" : "ADJUST"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-700/70">
              <span>Tip: Expiry is calculated from each earning date.</span>
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={fetchEarnedHistory}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: EDIT PROFILE (full name + phone) ===== */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">Edit profile</div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Update name & phone</h3>
              </div>

              <button type="button" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" onClick={() => setEditOpen(false)}>Close</button>
            </div>

            <div className="mt-4 space-y-3">
              {acctErr && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{acctErr}</div>}

              <div>
                <label className="storyverse-label">Full name</label>
                <input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="storyverse-input" />
              </div>

              <div>
                <label className="storyverse-label">Phone</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="storyverse-input" />
              </div>

              <div className="flex gap-2">
                <button className="btn-primary" disabled={acctLoading} onClick={saveProfileChanges}>{acctLoading ? 'Saving…' : 'Save'}</button>
                <button className="btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHANGE EMAIL ===== */}
      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setEmailOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">Change email</div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Update your login email</h3>
              </div>

              <button type="button" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" onClick={() => setEmailOpen(false)}>Close</button>
            </div>

            <div className="mt-4 space-y-3">
              {acctErr && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{acctErr}</div>}

              <div>
                <label className="storyverse-label">New email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="storyverse-input" />
              </div>

              <div>
                <label className="storyverse-label">Current password</label>
                <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="storyverse-input" />
              </div>

              <div className="flex gap-2">
                <button className="btn-primary" disabled={acctLoading} onClick={submitEmailChange}>{acctLoading ? 'Saving…' : 'Change email'}</button>
                <button className="btn-ghost" onClick={() => setEmailOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHANGE PASSWORD ===== */}
      {passOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setPassOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">Change password</div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Update your password</h3>
              </div>

              <button type="button" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" onClick={() => setPassOpen(false)}>Close</button>
            </div>

            <div className="mt-4 space-y-3">
              {acctErr && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{acctErr}</div>}

              <div>
                <label className="storyverse-label">Current password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="storyverse-input" />
              </div>

              <div>
                <label className="storyverse-label">New password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="storyverse-input" />
              </div>

              <div className="flex gap-2">
                <button className="btn-primary" disabled={acctLoading} onClick={submitPasswordChange}>{acctLoading ? 'Saving…' : 'Change password'}</button>
                <button className="btn-ghost" onClick={() => setPassOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: USED COINS DETAILS (Used card Details) ===== */}
      {useOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setUseOpen(false)}>
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">Used Coins</div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Usage history</h3>
                <p className="mt-1 text-sm text-slate-700/80">Where coins were redeemed (story + chapter).</p>
              </div>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={() => setUseOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {useLoading && (
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">Loading usage history…</div>
              )}

              {!useLoading && useErr && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{useErr}</div>
              )}

              {!useLoading && !useErr && usedHistory.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">
                  No usage yet.
                </div>
              )}

              {!useLoading && !useErr && usedHistory.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="max-h-[360px] overflow-auto bg-white">
                    {usedHistory.map((h) => {
                      const story = h.story_title || "Unknown story";
                      const chap = typeof h.chapter_number === "number" ? `Chapter ${h.chapter_number}` : "—";
                      return (
                        <div key={h.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-slate-900">
                              Redeemed • <span className="text-slate-700/70 font-semibold">{fmtDateTime(h.created_at)}</span>
                            </div>
                            <div className="text-sm font-extrabold text-slate-900">-{Math.abs(h.coins)} 🪙</div>
                          </div>

                          <div className="mt-1 text-sm text-slate-700/80">
                            <span className="font-semibold text-slate-900">{story}</span>
                            {" • "}
                            <span className="font-semibold text-slate-900">{chap}</span>
                            {h.note ? (
                              <>
                                {" • "}
                                <span className="text-slate-700/80">{h.note}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-slate-700/70">
              <span>Tip: This helps support & transparency.</span>
              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                onClick={fetchUsedHistory}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
