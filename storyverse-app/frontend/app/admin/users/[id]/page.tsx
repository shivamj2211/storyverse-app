"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AdminShell from "../../../../components/admin/AdminShell";
import { api, authHeaders } from "../../../lib/api";
import { useAlert } from "../../../../components/AlertProvider";

type User = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  isAdmin: boolean;
  isPremium: boolean;
  coins: number;
  createdAt: string;
};

type Tx = {
  id: string;
  user_id: string;
  email: string;
  type: "earn" | "redeem" | "adjust";
  coins: number;
  reason?: string | null;
  meta?: any;
  created_at: string;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: text };
  }
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { showAlert } = useAlert();

  const [user, setUser] = useState<User | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [delta, setDelta] = useState<string>("10");
  const [reason, setReason] = useState<string>("admin_adjust");

  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");

  const earned = useMemo(() => txs.filter(t => t.type === "earn").reduce((s, t) => s + t.coins, 0), [txs]);
  const used = useMemo(() => txs.filter(t => t.type === "redeem").reduce((s, t) => s + Math.abs(t.coins), 0), [txs]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [uRes, tRes] = await Promise.all([
        fetch(api(`/api/admin/users/${userId}`), { headers: authHeaders(), cache: "no-store" }),
        fetch(api(`/api/admin/coins/transactions?user_id=${encodeURIComponent(userId)}&limit=200&offset=0`), {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ]);

      const u = await readJsonSafe(uRes);
      const t = await readJsonSafe(tRes);

      if (!u.ok) throw new Error(u.data?.error || `User load failed (${u.status})`);
      if (!t.ok) throw new Error(t.data?.error || `Transactions load failed (${t.status})`);

      setUser(u.data);
      setTxs(Array.isArray(t.data?.transactions) ? t.data.transactions : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function adjustCoins() {
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      showAlert("Delta must be a non-zero number", { title: "Validation" });
      return;
    }

    setMutating(true);
    try {
      const res = await fetch(api("/api/admin/coins/adjust"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ user_id: userId, delta: d, reason: reason.trim() || "admin_adjust" }),
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) throw new Error(parsed.data?.error || "Adjust failed");

      showAlert("Coins updated", { title: "Success" });
      await load();
    } catch (e: any) {
      showAlert(e?.message || "Adjust failed", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  async function refund(txId: string) {
    showAlert("Refund this transaction?", {
      title: "Confirm refund",
      okText: "Refund",
      onOk: async () => {
        setMutating(true);
        try {
          const res = await fetch(api("/api/admin/coins/refund"), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ transaction_id: txId }),
          });

          const parsed = await readJsonSafe(res);
          if (!parsed.ok) throw new Error(parsed.data?.error || "Refund failed");

          showAlert("Refunded", { title: "Success" });
          await load();
        } catch (e: any) {
          showAlert(e?.message || "Refund failed", { title: "Error" });
        } finally {
          setMutating(false);
        }
      },
    });
  }

  return (
    <AdminShell title="User">
      <div className="space-y-6">
        {loading ? (
          <div className="text-sm text-slate-600 py-8">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>
        ) : !user ? (
          <div className="text-sm text-slate-600">User not found.</div>
        ) : (
          <>
            <div className="border rounded-2xl p-4">
              <div className="text-lg font-semibold text-slate-900">{user.email}</div>
              <div className="text-sm text-slate-600 mt-1">
                {user.fullName || "-"} · {user.phone || "-"} · Joined{" "}
                {new Date(user.createdAt).toLocaleDateString()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <div className="text-xs text-emerald-700 font-medium uppercase">Wallet</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">{user.coins}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium uppercase">Earned (ledger)</div>
                  <div className="text-2xl font-bold text-blue-800 mt-1">{earned}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <div className="text-xs text-amber-700 font-medium uppercase">Used (redeems)</div>
                  <div className="text-2xl font-bold text-amber-800 mt-1">{used}</div>
                </div>
              </div>
            </div>

            <div className="border rounded-2xl p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Adjust Coins</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-sm"
                  placeholder="delta (e.g. 10 or -20)"
                />
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-sm"
                  placeholder="reason"
                />
                <button
                  onClick={adjustCoins}
                  disabled={mutating}
                  className="rounded-xl bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
                >
                  Apply
                </button>
              </div>
              <div className="text-xs text-slate-500">
                Tip: use negative delta to deduct coins.
              </div>
            </div>

            <div className="border rounded-2xl overflow-hidden">
              <div className="p-4 border-b bg-slate-50 font-semibold text-slate-900">
                Coin Transactions
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Type</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Coins</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Reason</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Date</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{t.type}</td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          <span className={t.coins < 0 ? "text-red-600" : "text-emerald-700"}>
                            {t.coins}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.reason || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => refund(t.id)}
                            disabled={mutating}
                            className="text-red-600 hover:underline disabled:opacity-60"
                          >
                            Refund
                          </button>
                        </td>
                      </tr>
                    ))}
                    {txs.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-sm text-slate-600" colSpan={5}>
                          No transactions yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
