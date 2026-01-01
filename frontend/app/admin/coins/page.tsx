"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import { api, authHeaders } from "../../../app/lib/api";
import { useAlert } from "../../../components/AlertProvider";

/* ---------------- helpers ---------------- */

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: res.ok, status: res.status, data: null as any, raw: text };
  }
}

function fmtDate(d?: string) {
  if (!d) return "-";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  return x.toLocaleString();
}

/* ---------------- types ---------------- */

type Summary = {
  available: number;
  used: number;
  earned: number;
};

type Tx = {
  id: string;
  user_id?: string;
  email: string;
  type: "earn" | "redeem" | "adjust";
  coins: number;
  reason?: string | null;
  meta?: any;
  created_at: string;
};

type Rule = {
  key: string;
  label: string;
  coins: number;
  enabled: boolean;
  daily_cap?: number | null;
};

/* ---------------- modal ---------------- */

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-sm text-gray-600 hover:underline">
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function AdminCoinsPage() {
  const { showAlert } = useAlert();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");

  // adjust coins modal
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjUserId, setAdjUserId] = useState("");
  const [adjDelta, setAdjDelta] = useState(10);
  const [adjReason, setAdjReason] = useState("admin_adjust");

  // local filtered view (you still hit server search when pressing Search)
  const filteredTxs = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return txs;
    return txs.filter((t) => (t.email || "").toLowerCase().includes(s));
  }, [txs, q]);

  async function loadAll(opts?: { useServerSearch?: boolean }) {
    setError("");
    setLoading(true);

    try {
      const useServerSearch = opts?.useServerSearch ?? false;
      const txUrl =
        useServerSearch && q.trim()
          ? api(`/api/admin/coins/transactions?q=${encodeURIComponent(q.trim())}`)
          : api("/api/admin/coins/transactions");

      const [s, t, r] = await Promise.all([
        fetch(api("/api/admin/coins/summary"), {
          headers: { "Content-Type": "application/json", ...authHeaders() },
          cache: "no-store",
        }),
        fetch(txUrl, {
          headers: { "Content-Type": "application/json", ...authHeaders() },
          cache: "no-store",
        }),
        fetch(api("/api/admin/reward-rules"), {
          headers: { "Content-Type": "application/json", ...authHeaders() },
          cache: "no-store",
        }),
      ]);

      const ps = await readJsonSafe(s);
      const pt = await readJsonSafe(t);
      const pr = await readJsonSafe(r);

      const hint = (raw: string) =>
        raw?.startsWith("<!DOCTYPE") ? "Server returned HTML (route not found / redirect / auth)." : "";

      if (!ps.ok) throw new Error(ps.data?.error || `Failed to load summary (${ps.status}). ${hint(ps.raw)}`);
      if (!pt.ok) throw new Error(pt.data?.error || `Failed to load transactions (${pt.status}). ${hint(pt.raw)}`);
      if (!pr.ok) throw new Error(pr.data?.error || `Failed to load rules (${pr.status}). ${hint(pr.raw)}`);

      setSummary(ps.data);
      setTxs(pt.data?.transactions || []);
      setRules(pr.data?.rules || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load coins data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyAdjust() {
    if (!adjUserId || !adjDelta) {
      return showAlert("User ID and non-zero delta required", { title: "Validation" });
    }

    setMutating(true);
    try {
      const res = await fetch(api("/api/admin/coins/adjust"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ user_id: adjUserId.trim(), delta: adjDelta, reason: adjReason }),
      });
      const p = await readJsonSafe(res);
      if (!p.ok) throw new Error(p.data?.error || "Adjust failed");

      setAdjOpen(false);
      await loadAll();
      showAlert("Coins adjusted", { title: "Success" });
    } catch (e: any) {
      showAlert(e?.message || "Adjust failed", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  async function saveRule(r: Rule) {
    setMutating(true);
    try {
      // daily_cap: allow empty -> null
      const cap =
        r.daily_cap === undefined || r.daily_cap === null ? null : Number(r.daily_cap);

      if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
        showAlert("Daily cap must be empty (no cap) or a non-negative number", { title: "Validation" });
        return;
      }

      const res = await fetch(api(`/api/admin/reward-rules/${r.key}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          coins: r.coins,
          enabled: r.enabled,
          daily_cap: cap, // ✅ new
        }),
      });

      const p = await readJsonSafe(res);
      if (!p.ok) throw new Error(p.data?.error || "Update failed");

      await loadAll();
      showAlert("Rule updated", { title: "Success" });
    } catch (e: any) {
      showAlert(e?.message || "Rule update failed", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  async function refundTx(txId: string) {
    showAlert("Refund this transaction? It will reverse coins for the user.", {
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
          const p = await readJsonSafe(res);
          if (!p.ok) throw new Error(p.data?.error || "Refund failed");

          await loadAll();
          showAlert("Refunded successfully", { title: "Success" });
        } catch (e: any) {
          showAlert(e?.message || "Refund failed", { title: "Error" });
        } finally {
          setMutating(false);
        }
      },
    });
  }

  return (
    <AdminShell title="Coins">
      <div className="space-y-8">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="text-xl font-semibold">Coin Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Control balances, rewards, and audit coin usage.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdjOpen(true)}
              disabled={loading || mutating}
              className="rounded-xl bg-gray-900 text-white text-sm px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              Adjust Coins
            </button>
            <button
              onClick={() => loadAll()}
              disabled={loading || mutating}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Reload
            </button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-2xl p-4">
              <div className="text-xs text-gray-500">Available</div>
              <div className="text-2xl font-semibold">{summary.available}</div>
            </div>
            <div className="border rounded-2xl p-4">
              <div className="text-xs text-gray-500">Used</div>
              <div className="text-2xl font-semibold">{summary.used}</div>
            </div>
            <div className="border rounded-2xl p-4">
              <div className="text-xs text-gray-500">Earned</div>
              <div className="text-2xl font-semibold">{summary.earned}</div>
            </div>
          </div>
        )}

        {/* Reward Rules */}
        <div className="border rounded-2xl p-4 space-y-3">
          <div className="font-medium">Reward Rules</div>

          <div className="text-xs text-gray-500">
            Daily cap: empty means <b>no cap</b> (∞). Set 0 to disable earning for that rule without disabling it.
          </div>

          {rules.map((r) => (
            <div key={r.key} className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm border-t first:border-t-0 pt-3 first:pt-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-gray-500 font-mono">{r.key}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Coins</span>
                <input
                  type="number"
                  value={r.coins}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((x) =>
                        x.key === r.key ? { ...x, coins: Number(e.target.value) } : x
                      )
                    )
                  }
                  className="border rounded-xl px-3 py-1 w-24"
                />
              </div>

              {/* ✅ daily_cap input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Daily cap</span>
                <input
                  type="number"
                  value={r.daily_cap === null || r.daily_cap === undefined ? "" : String(r.daily_cap)}
                  placeholder="∞"
                  min={0}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((x) =>
                        x.key === r.key
                          ? { ...x, daily_cap: e.target.value === "" ? null : Number(e.target.value) }
                          : x
                      )
                    )
                  }
                  className="border rounded-xl px-3 py-1 w-28"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((x) =>
                        x.key === r.key ? { ...x, enabled: e.target.checked } : x
                      )
                    )
                  }
                />
                Enabled
              </label>

              <button
                onClick={() => saveRule(r)}
                disabled={mutating}
                className="text-blue-600 hover:underline disabled:opacity-60"
              >
                Save
              </button>
            </div>
          ))}
        </div>

        {/* Transactions */}
        <div className="border rounded-2xl overflow-hidden">
          <div className="p-3 border-b flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email"
              className="border rounded-xl px-3 py-2 text-sm w-full sm:w-72"
            />
            <div className="flex gap-2">
              <button
                onClick={() => loadAll({ useServerSearch: true })}
                disabled={loading || mutating}
                className="rounded-xl bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-60"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setQ("");
                  loadAll();
                }}
                disabled={loading || mutating}
                className="rounded-xl border text-sm px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
              >
                Clear
              </button>
            </div>

            <div className="text-xs text-gray-500 sm:ml-auto">
              Showing <b>{filteredTxs.length}</b> transactions
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Coins</th>
                  <th className="p-3 text-left">Reason</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">{t.email}</td>
                    <td className="p-3">{t.type}</td>
                    <td className="p-3 font-medium">
                      <span className={t.coins < 0 ? "text-red-600" : "text-emerald-700"}>
                        {t.coins}
                      </span>
                    </td>
                    <td className="p-3">{t.reason || "-"}</td>
                    <td className="p-3">{fmtDate(t.created_at)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => refundTx(t.id)}
                        disabled={mutating}
                        className="text-red-600 hover:underline disabled:opacity-60"
                      >
                        Refund
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTxs.length === 0 ? (
                  <tr>
                    <td className="p-4 text-sm text-gray-600" colSpan={6}>
                      No transactions found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Adjust modal */}
      <Modal open={adjOpen} title="Adjust coins" onClose={() => setAdjOpen(false)}>
        <div className="space-y-4">
          <input
            placeholder="User ID"
            value={adjUserId}
            onChange={(e) => setAdjUserId(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm w-full"
          />
          <input
            type="number"
            value={adjDelta}
            onChange={(e) => setAdjDelta(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 text-sm w-full"
          />
          <input
            placeholder="Reason"
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm w-full"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setAdjOpen(false)} className="text-sm text-gray-600">
              Cancel
            </button>
            <button
              onClick={applyAdjust}
              disabled={mutating}
              className="rounded-xl bg-gray-900 text-white text-sm px-4 py-2 disabled:opacity-60"
            >
              Apply
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Tip: Use negative delta to deduct coins. Example: -20
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
