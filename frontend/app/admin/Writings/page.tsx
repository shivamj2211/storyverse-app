"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, authHeaders, getToken } from "../../lib/api";

type Item = {
  id: string;
  type: string;
  language: string;
  title: string | null;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
};

function clamp(text: string, n = 160) {
  const t = (text || "").trim();
  return t.length <= n ? t : t.slice(0, n).trimEnd() + "…";
}

export default function AdminWritingsPage() {
  const token = useMemo(() => getToken(), []);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(api(`/api/admin/writings?status=${status}&limit=30&offset=0`), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.items || []);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token]);

  async function approve(id: string) {
    try {
      const res = await fetch(api(`/api/admin/writings/${id}/approve`), {
        method: "PATCH",
        headers: { ...authHeaders() },
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(json?.error || "Approve failed");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.message || "Approve failed");
    }
  }

  async function reject(id: string) {
    try {
      const res = await fetch(api(`/api/admin/writings/${id}/reject`), {
        method: "PATCH",
        headers: { ...authHeaders() },
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(json?.error || "Reject failed");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setErr(e?.message || "Reject failed");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-700 dark:text-zinc-300">Please login as admin.</p>
          <Link href="/login" className="mt-3 inline-block underline">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Moderation</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Approve or reject user submissions.</p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
        >
          Admin Home
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected"] as const).map((k) => {
          const active = status === k;
          return (
            <button
              key={k}
              onClick={() => setStatus(k)}
              className={[
                "rounded-full px-3 py-1.5 text-sm",
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              {k}
            </button>
          );
        })}
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {it.title || `${it.type.toUpperCase()} • ${it.language.toUpperCase()}`}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {it.author_name || "User"} {it.author_email ? `(${it.author_email})` : ""} • {new Date(it.created_at).toLocaleString()}
                  </div>
                </div>

                {status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => reject(it.id)}
                      className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approve(it.id)}
                      className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {it.status}
                  </span>
                )}
              </div>

              <div className="mt-3 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                {clamp(it.content, 260)}
              </div>
            </div>
          ))}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
              No {status} items.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
