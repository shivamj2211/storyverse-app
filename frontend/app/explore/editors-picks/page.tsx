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
  isEditorsPick: boolean;
  likesCount: number;
  viewsCount: number;
};

export default function EditorsPicksPage() {
  const token = useMemo(() => getToken(), []);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await fetch(api(`/api/explore/editors-picks?limit=50&offset=0`), {
          headers: token ? { ...authHeaders() } : undefined,
          cache: "no-store",
        });
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(json?.error || "Failed");

        if (!alive) return;
        setItems(json.items || []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/explore" className="text-sm font-medium underline">← Explore</Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">⭐ Editor’s Picks</h1>

      {err ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">{err}</div> : null}
      {loading ? <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div> : null}

      <div className="mt-6 space-y-3">
        {items.map((w) => (
          <Link key={w.id} href={`/explore/read/${w.id}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {w.title || `${w.type.toUpperCase()} • ${w.language.toUpperCase()}`}
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {w.content}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
