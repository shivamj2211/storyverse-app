"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "../lib/api";
import CoinsWallet from "../../components/CoinsWallet";

type MePayload = {
  user: {
    id?: string;
    email?: string | null;
    full_name?: string | null;
    coins?: number;
    plan?: "free" | "premium" | "creator";
    is_premium?: boolean;
  };
};

function resolvePlan(u: MePayload["user"]): "free" | "premium" | "creator" {
  if (u.plan === "premium" || u.plan === "creator" || u.plan === "free") return u.plan;
  return u.is_premium ? "premium" : "free";
}

export default function WalletPage() {
  const router = useRouter();

  const [me, setMe] = useState<MePayload["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getToken();
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(api("/api/auth/me"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as MePayload;
        setMe(data.user);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (!token) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <section className="parchment-panel">
            <div className="parchment-kicker">Wallet</div>
            <h1 className="parchment-h1">You’re not logged in</h1>
            <p className="parchment-sub">Please login to view your wallet.</p>

            <div className="primary-actions">
              <button className="btn-primary" onClick={() => router.push("/login")}>
                Go to Login
              </button>
              <Link className="btn-ghost" href="/profile">
                Back to Profile
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <section className="parchment-panel">
            <p className="text-slate-700/75">Loading wallet…</p>
          </section>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <section className="parchment-panel">
            <div className="parchment-kicker">Wallet</div>
            <h1 className="parchment-h1">Wallet not available</h1>
            <p className="parchment-sub">Unable to load wallet. Please try again.</p>

            <div className="primary-actions">
              <button className="btn-primary" onClick={() => router.refresh()}>
                Refresh
              </button>
              <Link className="btn-ghost" href="/profile">
                Back to Profile
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const plan = resolvePlan(me);
  const coins = Number.isFinite(Number(me.coins)) ? Number(me.coins) : 0;

  const unlockAt = 20;
  const canUnlock = plan !== "free" || coins >= unlockAt;

  return (
    <main className="parchment-wrap">
      <div className="parchment-shell-wide space-y-6">
        {/* Header (clean) */}
        <section className="parchment-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="parchment-kicker">Wallet</div>
              <h1 className="parchment-h1">Coins</h1>
              <p className="parchment-sub">
                Earned coins, usage history, and expiry — all in one place.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-2 text-xs font-extrabold tracking-wide text-slate-900 border border-slate-200">
                {plan.toUpperCase()}
              </span>
              <Link className="btn-ghost" href="/profile">
                Back to Profile
              </Link>
            </div>
          </div>

          <div className="hr-ink" />

          {/* Compact status strip (no repetition) */}
          
        </section>

        {/* Advanced wallet UI (history + expiry + used details + progress + recent activity) */}
        <CoinsWallet plan={plan} fallbackCoins={coins} />
      </div>
    </main>
  );
}
