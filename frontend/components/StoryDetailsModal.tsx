"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";

type Genre = { key: string; label: string };

export type StoryDetails = {
  id: string;
  title: string;
  summary: string;
  avgRating?: number | null;
  ratingsCount?: number | null; // total ratings (if you have)
  totalSteps?: number | null; // chapters/steps
  updatedAt?: string | null;
  saved?: boolean;
  authorName?: string | null; // writer name
  genres?: Genre[];
};

function formatDate(dt?: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function estimateReadingTimeMinutes(text: string) {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(15, Math.round(words / 200));
  return mins;
}

// ES5-safe overlap score (no for..of on Set)
function genreOverlapScore(a?: Genre[], b?: Genre[]) {
  const A = (a || []).map((g) => g.key);
  const B = new Set((b || []).map((g) => g.key));
  if (!A.length || !B.size) return 0;

  let inter = 0;
  for (let i = 0; i < A.length; i++) {
    if (B.has(A[i])) inter++;
  }
  return inter;
}

export default function StoryDetailsModal({
  open,
  onClose,
  story,
  allStories,
  onToggleSave,
  readHref,
}: {
  open: boolean;
  onClose: () => void;
  story: StoryDetails | null;
  allStories: StoryDetails[];
  onToggleSave?: (storyId: string, nextSaved: boolean) => Promise<void> | void;
  readHref?: (storyId: string) => string;
}) {
  // ESC + scroll lock
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const similar = useMemo(() => {
    if (!story) return [];
    const scored = allStories
      .filter((s) => s.id !== story.id)
      .map((s) => ({ s, score: genreOverlapScore(story.genres, s.genres) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // allow more suggestions
      .map((x) => x.s);
    return scored;
  }, [story, allStories]);

  if (!open || !story) return null;

  const avg = typeof story.avgRating === "number" ? story.avgRating.toFixed(1) : "—";
  const ratingsCount = story.ratingsCount ?? null;
  const steps = story.totalSteps ?? null;
  const updated = formatDate(story.updatedAt);
  const mins = estimateReadingTimeMinutes(`${story.title} ${story.summary}`);

  const href = readHref ? readHref(story.id) : `/stories/${story.id}`;

  const share = async () => {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}/stories/${story.id}` : "";
    const text = `Check out "${story.title}" on Storyverse`;

    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title: story.title, text, url });
        return;
      }
    } catch {
      // ignore
    }

    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    } catch {
      alert(url);
    }
  };

  const saveClick = async () => {
    const nextSaved = !Boolean(story.saved);
    try {
      await onToggleSave?.(story.id, nextSaved);
    } catch {
      // optional toast
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div
          className="
            w-full sm:max-w-3xl
            rounded-t-2xl sm:rounded-2xl
            bg-white dark:bg-zinc-900
            border border-black/10 dark:border-zinc-700
            shadow-2xl
            overflow-hidden
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (NO COVER IMAGE) */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-zinc-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* ✅ FULL title visible: no truncate */}
                <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-zinc-100 leading-snug break-words">
                  {story.title}
                </h2>

                <div className="mt-1 text-sm text-slate-600 dark:text-zinc-300">
                  Written by{" "}
                  <span className="font-medium text-slate-900 dark:text-zinc-100">
                    {story.authorName || "Unknown"}
                  </span>
                </div>

                {/* Meta row */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/25">
                    ⭐ {avg}
                    {typeof ratingsCount === "number" ? (
                      <span className="font-normal opacity-80">({ratingsCount})</span>
                    ) : null}
                  </span>

                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                        📚 Chapters <b>{steps ?? "5"}</b>
                        </div>


                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700">
                    🕒 {mins} min read
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-700 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700">
                    🗓️ Updated {updated}
                  </span>
                </div>

                {/* Genres */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(story.genres || []).length ? (
                    story.genres!.map((g) => (
                      <span
                        key={g.key}
                        className="inline-flex rounded-full px-3 py-1 text-xs bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {g.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-zinc-400">
                      No genres added
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-zinc-800 transition text-slate-700 dark:text-zinc-200 shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body (✅ Scroll when data is large) */}
          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto overscroll-contain scroll-smooth">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              Summary
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-zinc-200 whitespace-pre-wrap">
              {story.summary || "—"}
            </p>

            {/* ✅ Similar stories moved to the VERY END 
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Similar stories
                </h3>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Based on genres
                </span>
              </div>

              {similar.length ? (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {similar.map((s) => (
                    <Link
                      key={s.id}
                      href={`/stories/${s.id}`}
                      className="
                        block rounded-2xl p-3
                        border border-slate-200 dark:border-zinc-700
                        hover:bg-slate-50 dark:hover:bg-zinc-800 transition
                      "
                      onClick={onClose}
                    >
                      <div className="font-semibold text-slate-900 dark:text-zinc-100 break-words">
                        {s.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-zinc-300 line-clamp-2">
                        {s.summary}
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                        ⭐ {typeof s.avgRating === "number" ? s.avgRating.toFixed(1) : "—"}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                  No similar stories found.
                </div>
              )}
            </div>*/}
          </div>

          {/* Footer actions */}
          <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-zinc-700 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Link
                href={href}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                onClick={onClose}
              >
                Read / Continue
              </Link>

              <button
                onClick={saveClick}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              >
                {story.saved ? "Saved ✓" : "Save"}
              </button>

              <button
                onClick={share}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              >
                Share
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-sm text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
