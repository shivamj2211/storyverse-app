"use client";

import React, { useEffect, useState } from "react";
import { api, authHeaders } from "..//lib/api";
import { useRouter } from "next/navigation";


type MeResponse = {
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
    coins: number;
    plan: "free" | "premium" | "creator";
  };
};

// for the coin
type CoinSummaryResponse = {
  available: number;
  used: number;
};

type CoinHistoryItem = {
  id: string;
  type: "redeem" | "earn" | "adjust";
  coins: number; // positive number (UI will show - for redeem if needed)
  story_title?: string | null;
  chapter_number?: number | null;
  note?: string | null;
  created_at: string; // ISO
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function PlanBadge({ plan }: { plan: MeResponse["user"]["plan"] }) {
  const label = plan === "free" ? "FREE" : plan === "premium" ? "PREMIUM" : "CREATOR";
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white">
      {label}
    </span>
  );
}

export default function PremiumPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"premium" | "creator" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coinSummary, setCoinSummary] = useState<CoinSummaryResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [coinHistory, setCoinHistory] = useState<CoinHistoryItem[]>([]);
  const [coinHistoryErr, setCoinHistoryErr] = useState<string | null>(null);
   const router = useRouter();
  async function fetchMe() {
    try {
      const res = await fetch(api("/api/auth/me"), { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const data = (await res.json()) as MeResponse;
      setMe(data.user);
    } catch {
      // ignore
    }
  }

  // coins details 
  async function fetchCoinSummary() {
  // OPTIONAL endpoint (recommended):
  // GET /api/coins/summary  -> { available, used }
  try {
    const res = await fetch(api("/api/coins/summary"), { headers: { ...authHeaders() } });
    if (!res.ok) return;
    const data = (await res.json()) as CoinSummaryResponse;
    setCoinSummary(data);
  } catch {
    // ignore (fallback will handle)
  }
}

async function fetchCoinHistory() {
  // OPTIONAL endpoint (recommended):
  // GET /api/coins/history -> { items: CoinHistoryItem[] } OR CoinHistoryItem[]
  setCoinHistoryErr(null);
  setHistoryLoading(true);
  try {
    const res = await fetch(api("/api/coins/history"), { headers: { ...authHeaders() } });
    if (!res.ok) {
      setCoinHistoryErr("Unable to load coin history.");
      return;
    }
    const raw = await res.json();
    const items = Array.isArray(raw) ? raw : raw.items;
    setCoinHistory((items || []) as CoinHistoryItem[]);
  } catch {
    setCoinHistoryErr("Network error while loading history.");
  } finally {
    setHistoryLoading(false);
  }
}
//coin history states
  useEffect(() => {
  (async () => {
    setLoading(true);
    await fetchMe();
    await fetchCoinSummary(); // optional, safe
    setLoading(false);
  })();
}, []);

  async function upgrade(kind: "premium" | "creator") {
    setError(null);
    setBusy(kind);
    try {
      const endpoint = kind === "premium" ? "/api/premium/upgrade" : "/api/premium/creator";
      const res = await fetch(api(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });

      if (!res.ok) {
        const t = await res.text();
        console.error(t);
        setError("Upgrade failed. Please try again.");
        return;
      }

      await fetchMe();
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const currentPlan = me?.plan ?? "free";

 return (
  <main className="parchment-page">
    <div className="parchment-shell">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Storyverse Library Pass
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              Choose your <span className="parchment-accent">membership</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-700/80">
              Unlock full chapters, remove gates, and publish stories—crafted for long,
              comfortable reading.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {me && (
              <span className="parchment-badge">
                {me.plan === "free" ? "FREE" : me.plan === "premium" ? "PREMIUM" : "CREATOR"}
              </span>
            )}

        {me && (
          <div className="parchment-card !p-4 min-w-[240px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Coin Icon */}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
                  {/* simple coin glyph */}
                  <span className="text-lg leading-none">🪙</span>
                </span>

                <div>
                  <div className="text-xs font-bold tracking-[0.18em] uppercase text-slate-700/70">
                    Coins
                  </div>
                  <div className="text-[11px] text-slate-700/70">
                    Your wallet summary
                  </div>
                </div>
               
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Available */}
              <div className="rounded-2xl border border-slate-200 bg-white/60 px-3 py-3">
                <div className="text-[11px] font-semibold text-slate-700/70">Available</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {coinSummary?.available ?? me.coins}
                </div>
              </div>

              {/* Used + Details */}
              <div className="rounded-2xl border border-slate-200 bg-white/60 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-slate-700/70">Used</div>

                  <button
                    type="button"
                    className="text-[11px] font-semibold underline text-slate-900/80 hover:text-slate-900"
                    onClick={async () => {
                      setHistoryOpen(true);
                      // load history on demand (only when modal opens)
                      await fetchCoinHistory();
                    }}
                  >
                    Details
                  </button>
                </div>

                <div className="mt-1 text-lg font-extrabold text-slate-900">
                  {coinSummary?.used ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-700/70">
              Used coins show where you unlocked chapters.
            </div>
             <button
        type="button"
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
        onClick={() => router.push("/wallet")}
      >
        View Wallet Details
      </button>
          </div>
          
        )}
        

          </div>
        </div>

        {loading && <p className="mt-4 text-slate-700/70">Loading…</p>}
        {!loading && !me && (
          <p className="mt-4 text-slate-700/70">Please login to upgrade your plan.</p>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Free */}
        <section className="parchment-card">
          <div className="flex items-center justify-between relative">
            <h2 className="text-xl font-extrabold text-slate-900">Free</h2>
            <span className="parchment-badge">STARTER</span>
          </div>

          <p className="mt-2 text-sm text-slate-700/80 relative">
            Start reading and earn coins by rating.
          </p>

          <ul className="mt-6 space-y-3 text-sm parchment-list relative">
            <li>✅ Read only <b className="text-slate-900">2 chapters</b> per story</li>
            <li>✅ Earn coins by rating (unlock at <b className="text-slate-900">20 coins</b>)</li>
            <li>✅ Save limited stories</li>
            <li>✅ Continue reading runs</li>
          </ul>

          <div className="mt-6 relative">
            <button className="w-full parchment-btn" disabled>
              {currentPlan === "free" ? "Current Plan" : "Included"}
            </button>
          </div>
        </section>

        {/* Premium */}
        <section className="parchment-card">
          <div className="flex items-center justify-between relative">
            <h2 className="text-xl font-extrabold text-slate-900">Premium</h2>
            <span className="parchment-badge" style={{ borderColor: "rgba(15,118,110,0.28)" }}>
              READER+
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-700/80 relative">
            Read full journeys without limits.
          </p>

          <ul className="mt-6 space-y-3 text-sm parchment-list relative">
            <li>✅ Read all <b className="text-slate-900">5 chapters</b> of every story</li>
            <li>✅ Unlimited replays / runs</li>
            <li>✅ Faster progress (no coin gate)</li>
            <li>✅ More saves + smoother reading</li>
          </ul>

          <div className="mt-6 relative">
            <button
              className="w-full parchment-btn parchment-btn-primary"
              onClick={() => upgrade("premium")}
              disabled={!me || busy !== null || currentPlan === "premium" || currentPlan === "creator"}
            >
              {currentPlan === "premium"
                ? "Current Plan"
                : currentPlan === "creator"
                ? "Included in Creator"
                : busy === "premium"
                ? "Upgrading…"
                : "Upgrade to Premium"}
            </button>
          </div>

          <div className="mt-5 parchment-note relative">
            Best for readers who want uninterrupted story flow.
          </div>
        </section>

        {/* Creator */}
        <section className="parchment-card">
          <div className="flex items-center justify-between relative">
            <h2 className="text-xl font-extrabold text-slate-900">Creator</h2>
            <span className="parchment-badge" style={{ borderColor: "rgba(180,83,9,0.28)" }}>
              AUTHOR
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-700/80 relative">
            Publish stories and earn from performance.
          </p>

          <ul className="mt-6 space-y-3 text-sm parchment-list relative">
            <li>✅ Submit stories for publishing</li>
            <li>✅ Our team reviews &amp; may hire you</li>
            <li>✅ Earn money from story performance (commission applies)</li>
            <li>✅ Full access: all chapters + replays</li>
          </ul>

          <div className="mt-5 parchment-note relative">
            Contact: <span className="font-semibold text-slate-900">writers@storyverse.com</span>
          </div>

          <div className="mt-6 relative">
            <button
              className="w-full parchment-btn"
              onClick={() => upgrade("creator")}
              disabled={!me || busy !== null || currentPlan === "creator"}
            >
              {currentPlan === "creator"
                ? "Current Plan"
                : busy === "creator"
                ? "Upgrading…"
                : "Become a Creator"}
            </button>
          </div>
        </section>
      </div>

      <div className="mt-8 parchment-note text-center">
        Earn coins by rating stories. Free users unlock Chapter 3+ at{" "}
        <b className="text-slate-900">20 coins</b>, or upgrade anytime.
      </div>
    {/* Coin History Modal */}
{historyOpen && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    onClick={() => setHistoryOpen(false)}
  >
    <div
      className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
            Coin Details
          </div>
          <h3 className="mt-2 text-xl font-extrabold text-slate-900">
            Usage history
          </h3>
          <p className="mt-1 text-sm text-slate-700/80">
            Track where coins were redeemed (story + chapter).
          </p>
        </div>

        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          onClick={() => setHistoryOpen(false)}
        >
          Close
        </button>
      </div>

      <div className="mt-4">
        {historyLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">
            Loading history…
          </div>
        )}

        {!historyLoading && coinHistoryErr && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {coinHistoryErr}
          </div>
        )}

        {!historyLoading && !coinHistoryErr && coinHistory.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">
            No history yet.
          </div>
        )}

        {!historyLoading && !coinHistoryErr && coinHistory.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[360px] overflow-auto bg-white">
              {coinHistory.map((h) => {
                const isRedeem = h.type === "redeem";
                const story = h.story_title || "Unknown story";
                const chap =
                  typeof h.chapter_number === "number" ? `Chapter ${h.chapter_number}` : "—";
                const label = isRedeem ? "Redeemed" : h.type === "earn" ? "Earned" : "Adjusted";

                return (
                  <div
                    key={h.id}
                    className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-slate-900">
                        {label}{" "}
                        <span className="text-slate-700/70 font-semibold">
                          • {fmtDateTime(h.created_at)}
                        </span>
                      </div>

                      <div className="text-sm font-extrabold text-slate-900">
                        {isRedeem ? "-" : "+"}
                        {Math.abs(h.coins)} 🪙
                      </div>
                    </div>

                    <div className="text-sm text-slate-700/80">
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
        <span>
          Tip: This history is useful for support + transparency.
        </span>
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          onClick={fetchCoinHistory}
        >
          Refresh
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  </main>
);


}
