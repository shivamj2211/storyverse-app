"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

function clamp(t: string, n=220){ t=(t||"").trim(); return t.length<=n?t:t.slice(0,n).trimEnd()+"…"; }

export default function ExploreTypePage() {
  const params = useParams();
  const sp = useSearchParams();
  const type = String(params?.type || "");
  const lang = sp.get("lang") || "all";

  const token = useMemo(() => getToken(), []);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const qs = new URLSearchParams();
        if (lang !== "all") qs.set("lang", lang);
        qs.set("sort", "trending");
        qs.set("limit", "30");
        qs.set("offset", "0");

        const res = await fetch(api(`/api/explore/${type}?${qs.toString()}`), {
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
  }, [type, lang, token]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/explore" className="text-sm font-medium underline">← Explore</Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {type.toUpperCase()}
          </h1>
        </div>
      </div>

      {err ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">{err}</div> : null}
      {loading ? <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading…</div> : null}

      <div className="mt-6 space-y-3">
        {items.map((w) => (
          <Link key={w.id} href={`/explore/read/${w.id}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {w.title || `${w.type.toUpperCase()} • ${w.language.toUpperCase()}`}
              </div>
              {w.isEditorsPick ? <span className="text-xs">⭐ Pick</span> : null}
            </div>
            <div className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
              {clamp(w.content)}
            </div>
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              👁 {w.viewsCount} • ❤️ {w.likesCount}
            </div>
          </Link>
        ))}
        {!loading && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            No posts yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
