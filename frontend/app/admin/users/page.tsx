"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import { api, authHeaders } from "../../../app/lib/api";
import { useAlert } from "../../../components/AlertProvider";

type UserRow = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  coins?: number;
  is_admin?: boolean;
  is_premium?: boolean;
  created_at?: string; // from backend
  updated_at?: string;
};

type CoinTx = {
  id: string;
  user_id?: string;
  email?: string;
  type: "earn" | "redeem" | "adjust";
  coins: number;
  reason?: string | null;
  created_at: string;
  meta?: any;
};

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
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

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

export default function AdminUsersPage() {
  const { showAlert } = useAlert();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");

  // Edit modal
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editIsPremium, setEditIsPremium] = useState(false);

  // Coins modal
  const [coinUser, setCoinUser] = useState<UserRow | null>(null);
  const [coinDelta, setCoinDelta] = useState<number>(20);

  // ✅ NEW: History modal
  const [histUser, setHistUser] = useState<UserRow | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState("");
  const [histTxs, setHistTxs] = useState<CoinTx[]>([]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const hay = `${u.email} ${u.full_name || ""} ${u.phone || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [users, q]);

  async function loadUsers() {
    setError("");
    setLoading(true);
    try {
      const url = q.trim()
        ? api(`/api/admin/users?q=${encodeURIComponent(q.trim())}`)
        : api(`/api/admin/users`);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        cache: "no-store",
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) {
        const hint = parsed.raw?.startsWith("<!DOCTYPE")
          ? "Server returned HTML (404/redirect). Check API route + token."
          : "";
        throw new Error(parsed.data?.error || `Failed (${parsed.status}). ${hint}`);
      }

      setUsers(parsed.data?.users || []);
    } catch (e: any) {
      setError(e?.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditName(u.full_name || "");
    setEditPhone(u.phone || "");
    setEditIsAdmin(!!u.is_admin);
    setEditIsPremium(!!u.is_premium);
  }

  async function saveEdit() {
    if (!editUser) return;

    setMutating(true);
    try {
      const res = await fetch(api(`/api/admin/users/${editUser.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          full_name: editName,
          phone: editPhone,
          is_admin: editIsAdmin,
          is_premium: editIsPremium,
        }),
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) {
        throw new Error(parsed.data?.error || `Failed (${parsed.status})`);
      }

      setEditUser(null);
      await loadUsers();
      showAlert("User updated", { title: "Success" });
    } catch (e: any) {
      showAlert(e?.message || "Update failed", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  function openCoins(u: UserRow) {
    setCoinUser(u);
    setCoinDelta(20);
  }

  async function applyCoins() {
    if (!coinUser) return;

    if (!Number.isFinite(coinDelta) || coinDelta === 0) {
      return showAlert("Delta must be a non-zero number", { title: "Validation" });
    }

    setMutating(true);
    try {
      const res = await fetch(api(`/api/admin/users/${coinUser.id}/coins`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ delta: coinDelta }),
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) throw new Error(parsed.data?.error || `Failed (${parsed.status})`);

      setCoinUser(null);
      await loadUsers();
      showAlert("Coins updated", { title: "Success" });
    } catch (e: any) {
      showAlert(e?.message || "Coins update failed", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  async function deleteUser(u: UserRow) {
    showAlert(`Delete user ${u.email}?`, {
      title: "Confirm",
      okText: "Delete",
      onOk: async () => {
        setMutating(true);
        try {
          const res = await fetch(api(`/api/admin/users/${u.id}`), {
            method: "DELETE",
            headers: { ...authHeaders() },
          });

          const parsed = await readJsonSafe(res);
          if (!parsed.ok) throw new Error(parsed.data?.error || `Failed (${parsed.status})`);

          await loadUsers();
          showAlert("User deleted", { title: "Success" });
        } catch (e: any) {
          showAlert(e?.message || "Delete failed", { title: "Error" });
        } finally {
          setMutating(false);
        }
      },
    });
  }

  // ✅ NEW: load user coin transactions
  async function openHistory(u: UserRow) {
    setHistUser(u);
    setHistTxs([]);
    setHistError("");
    setHistLoading(true);

    try {
      // Preferred: user_id filter (best)
      // Fallback: if backend only supports q=email, it will still work
      const url =
        u.id
          ? api(`/api/admin/coins/transactions?user_id=${encodeURIComponent(u.id)}&limit=200&offset=0`)
          : api(`/api/admin/coins/transactions?q=${encodeURIComponent(u.email)}`);

      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...authHeaders() },
        cache: "no-store",
      });

      const parsed = await readJsonSafe(res);
      if (!parsed.ok) {
        const hint = parsed.raw?.startsWith("<!DOCTYPE")
          ? "Server returned HTML (404/redirect). Check API route + token."
          : "";
        throw new Error(parsed.data?.error || `Failed (${parsed.status}). ${hint}`);
      }

      setHistTxs(parsed.data?.transactions || []);
    } catch (e: any) {
      setHistError(e?.message || "Unable to load history");
    } finally {
      setHistLoading(false);
    }
  }

  // ✅ NEW: refund a transaction (if backend exists)
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

          const parsed = await readJsonSafe(res);
          if (!parsed.ok) throw new Error(parsed.data?.error || `Failed (${parsed.status})`);

          showAlert("Refunded", { title: "Success" });

          // reload history + users list
          if (histUser) await openHistory(histUser);
          await loadUsers();
        } catch (e: any) {
          showAlert(e?.message || "Refund failed", { title: "Error" });
        } finally {
          setMutating(false);
        }
      },
    });
  }

  return (
    <AdminShell title="Users">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Manage Users</h2>
            <p className="text-sm text-gray-600 mt-1">
              View and manage user accounts, roles, and coin balances.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadUsers}
              disabled={loading || mutating}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Reload
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email / name / phone"
            className="border rounded-xl px-3 py-2 text-sm w-full sm:w-80"
          />
          <button
            onClick={loadUsers}
            disabled={loading || mutating}
            className="rounded-xl bg-gray-900 text-white text-sm px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
          >
            Search
          </button>
        </div>

        <div className="border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No users found.</div>
          ) : (
            <div className="w-full overflow-x-auto -mx-2 px-2">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr className="text-left">
                    <th className="p-3">Email</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Coins</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.full_name || "-"}</td>
                      <td className="p-3">{u.phone || "-"}</td>
                      <td className="p-3 font-medium">{u.coins ?? 0}</td>
                      <td className="p-3">
                        {u.is_admin ? (
                          <span className="px-2 py-1 rounded-lg bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        ) : u.is_premium ? (
                          <span className="px-2 py-1 rounded-lg bg-green-100 text-green-800">
                            Premium
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-800">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="p-3">{fmtDate(u.created_at)}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openCoins(u)}
                            className="text-gray-700 hover:underline"
                          >
                            Coins
                          </button>

                          {/* ✅ NEW */}
                          <button
                            onClick={() => openHistory(u)}
                            className="text-gray-700 hover:underline"
                          >
                            History
                          </button>

                          <button
                            onClick={() => deleteUser(u)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={!!editUser} title="Edit user" onClose={() => setEditUser(null)}>
        {editUser ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900">{editUser.email}</div>
              <div className="text-xs text-gray-500">ID: {editUser.id}</div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
                className="border rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone"
                className="border rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editIsPremium}
                  onChange={(e) => setEditIsPremium(e.target.checked)}
                />
                Premium
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editIsAdmin}
                  onChange={(e) => setEditIsAdmin(e.target.checked)}
                />
                Admin
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditUser(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={mutating}
                className="rounded-xl bg-green-600 text-white text-sm px-4 py-2 hover:bg-green-500 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Coins modal */}
      <Modal open={!!coinUser} title="Adjust coins" onClose={() => setCoinUser(null)}>
        {coinUser ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900">{coinUser.email}</div>
              <div className="text-xs text-gray-500">Current coins: {coinUser.coins ?? 0}</div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                value={coinDelta}
                onChange={(e) => setCoinDelta(Number(e.target.value))}
                className="border rounded-xl px-3 py-2 text-sm w-40"
              />
              <div className="text-xs text-gray-500">
                Use positive to add, negative to subtract.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCoinUser(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={applyCoins}
                disabled={mutating}
                className="rounded-xl bg-gray-900 text-white text-sm px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
              >
                Apply
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ✅ NEW: History modal */}
      <Modal
        open={!!histUser}
        title={histUser ? `Coin history — ${histUser.email}` : "Coin history"}
        onClose={() => setHistUser(null)}
      >
        {histUser ? (
          <div className="space-y-3">
            {histLoading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : histError ? (
              <div className="text-sm text-red-600">{histError}</div>
            ) : histTxs.length === 0 ? (
              <div className="text-sm text-gray-600">No transactions found.</div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Coins</th>
                      <th className="p-2 text-left">Reason</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histTxs.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2">{t.type}</td>
                        <td className="p-2 font-medium">
                          <span className={t.coins < 0 ? "text-red-600" : "text-emerald-700"}>
                            {t.coins}
                          </span>
                        </td>
                        <td className="p-2">{t.reason || "-"}</td>
                        <td className="p-2">{fmtDate(t.created_at)}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => refundTx(t.id)}
                            disabled={mutating}
                            className="text-red-600 hover:underline disabled:opacity-60"
                            title="Requires backend /api/admin/coins/refund"
                          >
                            Refund
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Note: Refund works only if your backend has <code>/api/admin/coins/refund</code>.
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
