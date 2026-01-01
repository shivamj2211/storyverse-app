"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import { api, authHeaders } from "../../../app/lib/api";
import { useAlert } from "../../../components/AlertProvider";

type Genre = {
  key: string;
  label: string;
  icon?: string;
};

// ✅ Safe JSON reader: prevents "Unexpected token <"
async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: res.ok, status: res.status, data: null as any, raw: text };
  }
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
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:underline"
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [keyInput, setKeyInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [iconInput, setIconInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState("");

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabelInput, setEditLabelInput] = useState("");
  const [editIconInput, setEditIconInput] = useState("");

  const [viewing, setViewing] = useState<Genre | null>(null);

  const { showAlert } = useAlert();

  const sortedGenres = useMemo(() => {
    return [...genres].sort((a, b) => a.key.localeCompare(b.key));
  }, [genres]);

  async function loadGenres() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(api("/api/admin/genres"), {
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
          ? "Server returned HTML (likely 404/redirect/login). Check API route + auth token."
          : "";
        throw new Error(parsed.data?.error || `Failed (${parsed.status}). ${hint}`);
      }

      const list = parsed.data?.genres || parsed.data;
      setGenres(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Unable to load genres");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGenres();
  }, []);

  async function addGenre() {
    const key = keyInput.trim();
    const label = labelInput.trim();
    const icon = iconInput.trim();

    if (!key || !label) {
      return showAlert("Key and Label are required", { title: "Validation" });
    }

    if (!/^[a-z0-9_-]+$/.test(key)) {
      return showAlert("Key should be lowercase like: mystery, sci-fi, rom_com", {
        title: "Validation",
      });
    }

    setMutating(true);
    try {
      const res = await fetch(api("/api/admin/genres"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ key, label, icon }),
      });

      const parsed = await readJsonSafe(res);

      if (!parsed.ok) {
        const hint = parsed.raw?.startsWith("<!DOCTYPE")
          ? "Server returned HTML (likely 404/redirect/login). Check API route + auth token."
          : "";
        throw new Error(parsed.data?.error || `Failed (${parsed.status}). ${hint}`);
      }

      setKeyInput("");
      setLabelInput("");
      setIconInput("");
      await loadGenres();
      showAlert("Genre added", { title: "Success" });
    } catch (e: any) {
      showAlert(e?.message || "Failed to add genre", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  async function deleteGenre(key: string) {
    showAlert(`Delete genre '${key}'?`, {
      title: "Confirm",
      okText: "Delete",
      onOk: async () => {
        setMutating(true);
        try {
          const res = await fetch(api(`/api/admin/genres/${key}`), {
            method: "DELETE",
            headers: {
              ...authHeaders(),
            },
          });

          const parsed = await readJsonSafe(res);

          if (!parsed.ok) {
            const hint = parsed.raw?.startsWith("<!DOCTYPE")
              ? "Server returned HTML (likely 404/redirect/login). Check API route + auth token."
              : "";
            throw new Error(parsed.data?.error || `Failed (${parsed.status}). ${hint}`);
          }

          setViewing((v) => (v?.key === key ? null : v));
          setEditingKey((k) => (k === key ? null : k));

          await loadGenres();
          showAlert("Genre deleted", { title: "Success" });
        } catch (err: any) {
          showAlert(err?.message || "Delete failed", { title: "Error" });
        } finally {
          setMutating(false);
        }
      },
    });
  }

  function startEdit(g: Genre) {
    setEditingKey(g.key);
    setEditLabelInput(g.label || "");
    setEditIconInput(g.icon || "");
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditLabelInput("");
    setEditIconInput("");
  }

  async function saveEdit(key: string) {
    const label = editLabelInput.trim();
    const icon = editIconInput.trim();

    if (!label) return showAlert("Label required", { title: "Validation" });

    setMutating(true);
    try {
      const res = await fetch(api(`/api/admin/genres/${key}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ label, icon }),
      });

      const parsed = await readJsonSafe(res);

      if (!parsed.ok) {
        const hint = parsed.raw?.startsWith("<!DOCTYPE")
          ? "Server returned HTML (likely 404/redirect/login). Check API route + auth token."
          : "";
        throw new Error(parsed.data?.error || `Failed (${parsed.status}). ${hint}`);
      }

      cancelEdit();
      await loadGenres();
      showAlert("Genre updated", { title: "Success" });
    } catch (e: any) {
      showAlert(e?.message || "Failed to update genre", { title: "Error" });
    } finally {
      setMutating(false);
    }
  }

  return (
    <AdminShell title="Genres">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Genres</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage genres used in filters and story tagging.
            </p>
          </div>

          <button
            onClick={loadGenres}
            disabled={loading || mutating}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Reload
          </button>
        </div>

        {/* Add genre */}
        <div className="border rounded-2xl p-4 space-y-3">
          <div className="text-sm font-medium">Add New Genre</div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              placeholder="key (e.g. mystery)"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="label (e.g. Mystery)"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <input
              placeholder="icon (emoji or class)"
              value={iconInput}
              onChange={(e) => setIconInput(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={addGenre}
              disabled={mutating}
              className="rounded-xl bg-gray-900 text-white text-sm px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              Add
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Tip: key should be lowercase and stable. Example: <code>romance</code>,{" "}
            <code>sci-fi</code>, <code>thriller</code>
          </div>
        </div>

        {/* List genres */}
        <div className="border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : sortedGenres.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">No genres found.</div>
          ) : (
            sortedGenres.map((g) => (
              <div
                key={g.key}
                className="flex items-center justify-between p-4 border-b last:border-b-0"
              >
                <div className="min-w-0">
                  {editingKey === g.key ? (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={editLabelInput}
                          onChange={(e) => setEditLabelInput(e.target.value)}
                          placeholder="Label"
                          className="border rounded-xl px-3 py-2 text-sm flex-1"
                        />
                        <input
                          value={editIconInput}
                          placeholder="Icon"
                          onChange={(e) => setEditIconInput(e.target.value)}
                          className="border rounded-xl px-3 py-2 text-sm w-full sm:w-28"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        Key: <span className="font-mono">{g.key}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium flex items-center gap-2">
                        {g.icon ? <span className="text-lg">{g.icon}</span> : null}
                        <span className="truncate">{g.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{g.key}</div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {editingKey === g.key ? (
                    <>
                      <button
                        onClick={() => saveEdit(g.key)}
                        disabled={mutating}
                        className="rounded-xl bg-green-600 text-white text-sm px-3 py-1 hover:bg-green-500 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setViewing(g)}
                        className="text-sm text-gray-700 hover:underline"
                      >
                        View
                      </button>
                      <button
                        onClick={() => startEdit(g)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteGenre(g.key)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View modal */}
      <Modal open={!!viewing} title="Genre details" onClose={() => setViewing(null)}>
        {viewing ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="text-2xl">{viewing.icon || "📚"}</div>
              <div>
                <div className="font-semibold">{viewing.label}</div>
                <div className="text-xs text-gray-500 font-mono">{viewing.key}</div>
              </div>
            </div>

            <div className="border rounded-xl p-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">Raw JSON</div>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(viewing, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
