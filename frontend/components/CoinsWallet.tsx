"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, authHeaders } from "../app/lib/api"; // ✅ if this path breaks, change to "@/app/lib/api" or "../../lib/api"

type CoinSummaryResponse = {
  available: number;
  used: number;
};

type CoinHistoryItem = {
  id: string;
  type: "redeem" | "earn" | "adjust";
  coins: number;
  story_title?: string | null;
  chapter_number?: number | null;
  note?: string | null;
  created_at: string;
};

const COIN_UNLOCK_THRESHOLD = 20;
const COIN_EXPIRY_YEARS = 1;

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

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hintText(plan: "free" | "premium" | "creator", availableCoins: number) {
  if (plan !== "free")
    return "You’re on a paid plan — coin gates are bypassed. Coins still track your activity.";
  if (availableCoins <= 0)
    return "Earn your first coins by rating a journey — then unlock Chapter 3+.";
  if (availableCoins < COIN_UNLOCK_THRESHOLD)
    return `You’re close. Earn ${COIN_UNLOCK_THRESHOLD - availableCoins} more coin(s) to unlock Chapter 3+.`;
  return "You have enough coins! You can unlock Chapter 3+ anytime.";
}

function activityTitle(h: {
  type: string;
  story_title?: string | null;
  chapter_number?: number | null;
  note?: string | null;
}) {
  const story = h.story_title || "Unknown story";
  const chap = typeof h.chapter_number === "number" ? ` • Chapter ${h.chapter_number}` : "";
  if (h.type === "redeem") return `Unlocked with coins • ${story}${chap}`;
  if (h.type === "earn") return h.note ? `Earned coins • ${h.note}` : "Earned coins";
  return h.note ? `Coin update • ${h.note}` : "Coin update";
}

export default function CoinsWallet({
  plan,
  fallbackCoins,
}: {
  plan: "free" | "premium" | "creator";
  fallbackCoins: number; // from /api/auth/me -> user.coins (fallback)
}) {
  const [coinSummary, setCoinSummary] = useState<CoinSummaryResponse | null>(null);

  // Separate modals
  const [earnOpen, setEarnOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);

  // Earned data
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnErr, setEarnErr] = useState<string | null>(null);
  const [earnedHistory, setEarnedHistory] = useState<CoinHistoryItem[]>([]);

  // Used data
  const [useLoading, setUseLoading] = useState(false);
  const [useErr, setUseErr] = useState<string | null>(null);
  const [usedHistory, setUsedHistory] = useState<CoinHistoryItem[]>([]);

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
      // fallback filter in case backend ignores query
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
      // fallback filter in case backend ignores query
      setUsedHistory(all.filter((x) => x.type === "redeem"));
    } catch {
      setUseErr("Network error while loading usage history.");
    } finally {
      setUseLoading(false);
    }
  }

  useEffect(() => {
    // load wallet data once
    (async () => {
      await fetchCoinSummary();
      await fetchEarnedHistory();
      await fetchUsedHistory();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableCoins = coinSummary?.available ?? fallbackCoins;
  const usedCoins = coinSummary?.used ?? 0;

  const progress = clamp01(availableCoins / COIN_UNLOCK_THRESHOLD);
  const progressPct = Math.round(progress * 100);

  const smartHint = useMemo(() => hintText(plan, availableCoins), [plan, availableCoins]);

  const mergedRecent = useMemo(() => {
    return [...(earnedHistory || []), ...(usedHistory || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [earnedHistory, usedHistory]);

  return (
    <>
      {/* Wallet Panel */}
      <div className="parchment-panel mt-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/* <div className="parchment-kicker">Wallet</div> */}
            <div className="parchment-h1" style={{ fontSize: 22 }}>
              Coins & History
            </div>
            <p className="parchment-sub">
              Track available coins, used coins, and where you redeemed them (story + chapter).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-11 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4">
              <span className="text-sm font-semibold text-slate-700/70">Total Coins</span>
              <span className="min-w-[28px] text-right text-lg font-extrabold text-slate-900">
                {availableCoins}
              </span>
            </div>

            {/* Earned Details */}
            <button
              type="button"
              className="h-11 inline-flex items-center justify-center rounded-2xl px-6 text-sm font-extrabold text-white shadow-sm
                         bg-gradient-to-r from-emerald-700 to-amber-700 hover:opacity-95"
              onClick={async () => {
                setEarnOpen(true);
                await fetchEarnedHistory();
              }}
            >
              View Details
            </button>
          </div>
        </div>

        <div className="hr-ink" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Available */}
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 border border-amber-200">
                <span className="text-lg leading-none">🪙</span>
              </span>

              <div>
                <div className="text-sm font-extrabold text-slate-900">Available</div>
                <div className="text-[11px] text-slate-700/70">Ready to redeem</div>
              </div>
            </div>

            <div className="mt-4 text-3xl font-extrabold text-slate-900">{availableCoins}</div>

            <div className="mt-2 text-[12px] text-slate-700/70">
              Use coins to unlock Chapter 3+ for free users.
            </div>
          </div>

          {/* Used */}
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900 border border-slate-200">
                  <span className="text-lg leading-none">📜</span>
                </span>

                <div>
                  <div className="text-sm font-extrabold text-slate-900">Used</div>
                  <div className="text-[11px] text-slate-700/70">Redeemed so far</div>
                </div>
              </div>

              {/* Usage Details */}
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                onClick={async () => {
                  setUseOpen(true);
                  await fetchUsedHistory();
                }}
              >
                Details
              </button>
            </div>

            <div className="mt-4 text-3xl font-extrabold text-slate-900">{usedCoins}</div>

            <div className="mt-2 text-[12px] text-slate-700/70">
              Shows where you unlocked chapters with coins.
            </div>
          </div>

          {/* How coins work */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white/80 to-white/40 p-4">
            <div className="text-sm font-extrabold text-slate-900">How coins work</div>

            <ul className="mt-3 space-y-2 text-sm text-slate-700/80">
              <li>✅ Earn coins by rating journeys</li>
              <li>✅ Redeem coins to unlock extra chapters</li>
              <li>
                ✅ Free users unlock Chapter 3+ at <b className="text-slate-900">20 coins</b>
              </li>
            </ul>

            <div className="mt-4 flex gap-2">
              <Link className="btn-ghost" href="/premium">
                Upgrade
              </Link>
              <Link className="btn-ghost" href="/stories">
                Browse
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Features */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Smart hint + progress */}
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 lg:col-span-2">
            <div className="text-sm font-extrabold text-slate-900">Next unlock</div>
            <p className="mt-1 text-sm text-slate-700/80">{smartHint}</p>

            {plan === "free" ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] text-slate-700/70">
                  <span>Chapter 3+ unlock progress</span>
                  <span className="font-semibold text-slate-900/80">
                    {Math.min(availableCoins, COIN_UNLOCK_THRESHOLD)} / {COIN_UNLOCK_THRESHOLD} •{" "}
                    {progressPct}%
                  </span>
                </div>

                <div className="mt-2 h-3 w-full rounded-full bg-slate-200/70 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-emerald-700 to-amber-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="mt-2 text-[11px] text-slate-700/70">
                  Tip: Rate journeys to earn coins faster.
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700/80">
                Paid plans bypass coin gates — progress is shown for tracking only.
              </div>
            )}
          </div>

          {/* Recent activity (last 3) */}
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">Recent activity</div>
              <button
                type="button"
                className="text-[11px] font-semibold underline text-slate-900/80 hover:text-slate-900"
                onClick={async () => {
                  setEarnOpen(true);
                  await fetchEarnedHistory();
                }}
              >
                View earned
              </button>
            </div>

            {mergedRecent.length === 0 ? (
              <div className="mt-3 text-sm text-slate-700/70">No coin activity yet.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {mergedRecent.map((h) => {
                  const isRedeem = h.type === "redeem";
                  return (
                    <div key={h.id} className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {activityTitle(h)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-700/70">
                            {fmtDateTime(h.created_at)}
                          </div>
                        </div>

                        <div className="shrink-0 text-sm font-extrabold text-slate-900">
                          {isRedeem ? "-" : "+"}
                          {Math.abs(h.coins)} 🪙
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coin earning breakdown */}
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white/70 p-4">
          <div className="text-sm font-extrabold text-slate-900">How you earn coins</div>
          <p className="mt-1 text-sm text-slate-700/80">
            Simple rewards for engagement (values can be adjusted later).
         While reading, tap Rate → coins are added to your wallet instantly. Once you reach 20 coins, you can continue beyond Chapter 2 on the Free plan.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="text-sm font-semibold text-slate-900">⭐ Rate a journey</div>
              <div className="mt-1 text-[12px] text-slate-700/70">Earn coins after rating</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">+5 🪙</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="text-sm font-semibold text-slate-900">🏁 Complete a story</div>
              <div className="mt-1 text-[12px] text-slate-700/70">Finish all chapters</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">+3 🪙</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="text-sm font-semibold text-slate-900">🔁 Replay (first time)</div>
              <div className="mt-1 text-[12px] text-slate-700/70">Encourage re-reading</div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">+2 🪙</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="btn-ghost" href="/stories">Start reading</Link>
            <Link className="btn-ghost" href="/runs">Continue reading</Link>
            <Link className="btn-ghost" href="/premium">Upgrade</Link>
          </div>
        </div>
      </div>

      {/* ===== Earned Details Modal ===== */}
      {earnOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setEarnOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                  Earned Coins
                </div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  Earning history & expiry
                </h3>
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
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">
                  Loading earned history…
                </div>
              )}

              {!earnLoading && earnErr && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {earnErr}
                </div>
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
                      const expiry = addYears(h.created_at, COIN_EXPIRY_YEARS);
                      const left = expiry ? daysLeft(expiry) : null;
                      const source = h.note || (h.type === "adjust" ? "Admin adjustment" : "Earned reward");

                      return (
                        <div key={h.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900">
                                +{Math.abs(h.coins)} 🪙{" "}
                                <span className="text-slate-700/70 font-semibold">• {source}</span>
                              </div>

                              <div className="mt-1 text-sm text-slate-700/80">
                                <b>Earned:</b> {fmtDateTime(h.created_at)}
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

      {/* ===== Used Details Modal ===== */}
      {useOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setUseOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-[rgba(255,255,255,0.96)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                  Used Coins
                </div>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">Usage history</h3>
                <p className="mt-1 text-sm text-slate-700/80">
                  Where coins were redeemed (story + chapter).
                </p>
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
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-700/80">
                  Loading usage history…
                </div>
              )}

              {!useLoading && useErr && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {useErr}
                </div>
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
                      const chap =
                        typeof h.chapter_number === "number" ? `Chapter ${h.chapter_number}` : "—";
                      return (
                        <div key={h.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-slate-900">
                              Redeemed •{" "}
                              <span className="text-slate-700/70 font-semibold">{fmtDateTime(h.created_at)}</span>
                            </div>
                            <div className="text-sm font-extrabold text-slate-900">
                              -{Math.abs(h.coins)} 🪙
                            </div>
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
    </>
  );
}
