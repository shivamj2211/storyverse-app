"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import { api, authHeaders } from "../../lib/api";
import { useAlert } from "../../../components/AlertProvider";

type Rule = {
  key: string;
  label: string;
  coins: number;
  enabled: boolean;
  daily_cap: number | null;
  updated_at?: string;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: text };
  }
}

export default function RewardsPage() {
  const { showAlert } = useAlert();

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [coins, setCoins] = useState<number>(0);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [dailyCap, setDailyCap] = useState<string>(""); // keep as string for empty/null

  const sorted = useMemo(() => {
    return [...rules].sort((a, b) => a.key.localeCompare(b.key));
  }, [rules]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(api("/api/admin/reward-rules"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) throw new Error(parsed.data?.error || `Failed (${parsed.status})`);

      const list = parsed.data?.rules || [];
      setRules(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load reward rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(r: Rule) {
    setEditingKey(r.key);
    setLabel(r.label || "");
    setCoins(Number(r.coins || 0));
    setEnabled(!!r.enabled);
    setDailyCap(r.daily_cap === null || r.daily_cap === undefined ? "" : String(r.daily_cap));
  }

  function cancel() {
    setEditingKey(null);
    setLabel("");
    setCoins(0);
    setEnabled(true);
    setDailyCap("");
  }

  async function save(key: string) {
    setMutating(true);
    try {
      const cap =
        dailyCap.trim() === ""
          ? null
          : Number(dailyCap);

      if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
        showAlert("daily_cap must be empty (null) or a non-negative number", { title: "Validation" });
        setMutating(false);
        return;
      }

      const res = await fetch(api(`/api/admin/reward-rules/${key}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          label: label.trim(),
          coins: Number(coins),
          enabled: Boolean(enabled),
          daily_cap: cap,
        }),
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) throw new Error(parsed.data?.error || "Update failed");

      showAlert("Saved", { title: "Success" });
      cancel();
      await load();
    } catch (e: any) {
      showAlert(e?.message || "Update failed", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  return (
    <AdminShell title="Rewards (Rules)">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reward Rules</h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure how many coins users earn (and daily caps).
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading || mutating}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Reload
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600 py-8">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
            {error}
          </div>
        ) : (
          <div className="border rounded-2xl overflow-hidden">
            {sorted.map((r) => (
              <div key={r.key} className="p-4 border-b last:border-b-0 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {editingKey === r.key ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          className="border rounded-xl px-3 py-2 text-sm"
                          placeholder="label"
                        />
                        <input
                          value={String(coins)}
                          onChange={(e) => setCoins(Number(e.target.value))}
                          className="border rounded-xl px-3 py-2 text-sm"
                          placeholder="coins"
                          type="number"
                        />
                        <input
                          value={dailyCap}
                          onChange={(e) => setDailyCap(e.target.value)}
                          className="border rounded-xl px-3 py-2 text-sm"
                          placeholder="daily_cap (empty = no cap)"
                          type="number"
                          min={0}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700 px-2">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                          />
                          Enabled
                        </label>
                      </div>

                      <div className="text-xs text-slate-500">
                        Key: <span className="font-mono">{r.key}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{r.key}</span>
                        <span>— {r.label}</span>
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Coins: <b>{r.coins}</b>{" "}
                        · Daily cap: <b>{r.daily_cap === null ? "∞" : r.daily_cap}</b>{" "}
                        · Status:{" "}
                        <b className={r.enabled ? "text-emerald-700" : "text-red-600"}>
                          {r.enabled ? "ENABLED" : "DISABLED"}
                        </b>
                      </div>
                    </>
                  )}
                </div>

                <div className="shrink-0">
                  {editingKey === r.key ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => save(r.key)}
                        disabled={mutating}
                        className="rounded-xl bg-emerald-600 text-white text-sm px-3 py-2 hover:bg-emerald-500 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button onClick={cancel} className="text-sm text-slate-600 hover:underline">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(r)} className="text-sm text-blue-600 hover:underline">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}

            {sorted.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No rules found.</div>
            ) : null}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
