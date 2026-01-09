"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, authHeaders, getToken } from "../lib/api";

type WritingType = "shayari" | "poem" | "kids" | "micro" | "thought";
type WritingLang = "en" | "hi" | "hinglish";

type WritingCard = {
  id: string;
  type: WritingType;
  language: WritingLang;
  title: string | null;
  content: string;
  isEditorsPick: boolean;
  likesCount: number;
  viewsCount: number;
};

type ExploreResponse = {
  editorsPicks: WritingCard[];
  sections: Array<{
    key: WritingType;
    title: string;
    items: WritingCard[];
  }>;
};

function clampPreview(text: string, max = 140) {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

function badgeForType(t: WritingType) {
  switch (t) {
    case "shayari":
      return "Shayari";
    case "poem":
      return "Poem";
    case "kids":
      return "Kids";
    case "micro":
      return "Micro";
    case "thought":
      return "Thought";
    default:
      return "Write";
  }
}

function labelForLang(l: "all" | WritingLang) {
  if (l === "all") return "All";
  if (l === "hi") return "Hindi";
  if (l === "en") return "English";
  return "Hinglish";
}

export default function ExplorePage() {
  const [lang, setLang] = useState<"all" | WritingLang>("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState<ExploreResponse | null>(null);

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const qs = new URLSearchParams();
        if (lang !== "all") qs.set("lang", lang);

        const res = await fetch(api(`/api/explore?${qs.toString()}`), {
          headers: token ? { ...authHeaders() } : undefined,
          cache: "no-store",
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok) throw new Error(json?.error || "Failed to load Explore");
        if (!alive) return;

        setData(json as ExploreResponse);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Something went wrong");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [lang, token]);

  const sections = data?.sections || [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Explore
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Shayari, poems, kids tales & micro stories — in Hindi and English.
          </p>
        </div>

        <Link
          href="/Write"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium !text-white shadow-sm hover:opacity-95 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Write
        </Link>
      </div>

      {/* Language chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "hi", "en", "hinglish"] as const).map((k) => {
          const active = lang === k;
          return (
            <button
              key={k}
              onClick={() => setLang(k)}
              className={[
                "rounded-full px-3 py-1.5 text-sm transition",
                active
                  ? "bg-zinc-900 !text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-900",
              ].join(" ")}
            >
              {labelForLang(k)}
            </button>
          );
        })}
      </div>

      {/* States */}
      {err ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-6">
          <SkeletonRail />
          <SkeletonRail />
          <SkeletonRail />
        </div>
      ) : null}

      {!loading && !err && data && (
        <div className="mt-6 space-y-8">
          {/* Editor’s Picks */}
          <Section
            title="⭐ Editor’s Picks"
            subtitle="Handpicked by the team"
            viewAllHref="/explore/editors-picks"
            items={data.editorsPicks}
          />

          {sections.map((sec) => (
            <Section
              key={sec.key}
              title={sec.title}
              subtitle="Trending + fresh reads"
              viewAllHref={`/explore/${sec.key}?lang=${lang}`}
              items={sec.items}
            />
          ))}

          {/* Empty fallback */}
          {data.editorsPicks.length === 0 && sections.every((s) => s.items.length === 0) ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-zinc-700 dark:text-zinc-300">
                Nothing here yet. Seed some admin content first, then open user submissions.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link
                  href="/admin/writings/new"
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium !text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Add Admin Content
                </Link>
                <Link
                  href="/Write"
                  className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Write Something
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  viewAllHref,
  items,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  items: WritingCard[];
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>

        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            See more →
          </Link>
        ) : null}
      </div>

      <div className="mt-3 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0">
        {items.map((w) => (
          <Link
            key={w.id}
            href={`/explore/read/${w.id}`}
            className="min-w-[240px] max-w-[240px] shrink-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {badgeForType(w.type)}
              </span>

              {w.isEditorsPick ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  ⭐ Pick
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              {w.title ? (
                <p className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {w.title}
                </p>
              ) : null}

              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {clampPreview(w.content, 170)}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="uppercase tracking-wide">{w.language}</span>
              <span className="flex items-center gap-3">
                <span>👁 {w.viewsCount}</span>
                <span>❤️ {w.likesCount}</span>
              </span>
            </div>
          </Link>
        ))}

        {items.length === 0 ? (
          <div className="min-w-[240px] max-w-[240px] shrink-0 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            No posts yet in this section.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonRail() {
  return (
    <div>
      <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 flex gap-3 overflow-hidden">
        {[1, 2, 3, 4].map((k) => (
          <div
            key={k}
            className="h-[160px] w-[240px] rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
