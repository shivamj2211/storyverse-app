"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, authHeaders, getToken } from "../../../lib/api";

type Writing = {
  id: string;
  type: string;
  language: string;
  title: string | null;
  content: string;
  isEditorsPick: boolean;
  likesCount: number;
  viewsCount: number;
};

export default function ExploreReadPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const token = useMemo(() => getToken(), []);
  const [w, setW] = useState<Writing | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // load writing (+ likedByMe if logged in)
        const url = token ? api(`/api/writings/${id}/me`) : api(`/api/writings/${id}`);
        const res = await fetch(url, { headers: token ? { ...authHeaders() } : undefined, cache: "no-store" });
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(json?.error || "Failed to load");

        if (!alive) return;
        setW(json.writing);
        setLiked(!!json.likedByMe);

        // fire view ping (don’t block UI)
        fetch(api(`/api/writings/${id}/view`), { method: "POST" }).catch(() => {});
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id, token]);

  async function toggleLike() {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(api(`/api/writings/${id}/like`), {
        method: "POST",
        headers: { ...authHeaders() },
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(json?.error || "Failed to like");

      const nextLiked = !!json.liked;
      setLiked(nextLiked);
      setW((prev) =>
        prev
          ? {
              ...prev,
              likesCount: Math.max(0, prev.likesCount + (nextLiked ? 1 : -1)),
            }
          : prev
      );
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
        <div className="mt-4">
          <Link className="text-sm font-medium underline" href="/explore">
            ← Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  if (!w) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300" href="/explore">
            ← Explore
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {w.title || "Reading"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {w.type.toUpperCase()} • {w.language.toUpperCase()} {w.isEditorsPick ? " • ⭐ Editor’s Pick" : ""}
          </p>
        </div>

        <button
          onClick={toggleLike}
          className={[
            "rounded-xl px-4 py-2 text-sm font-medium shadow-sm",
            liked
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100",
          ].join(" ")}
        >
          {liked ? "❤️ Liked" : "🤍 Like"} • {w.likesCount}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
          {w.content}
        </pre>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>👁 {w.viewsCount} views</span>
          <span>Share coming soon</span>
        </div>
      </div>
    </div>
  );
}
