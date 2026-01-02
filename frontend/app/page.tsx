"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "./lib/api";

type Genre = { key: string; label: string };

type Story = {
  id: string;
  title: string;
  summary: string;
  avgRating: number;
  saved: boolean;
  coverImageUrl?: string | null;
  genres?: Genre[];
  updatedAt?: string | null;
  runs7d?: number;
};

type StoriesResponse = {
  stories: Story[];
  total: number;
  limit: number;
  offset: number;
};

type GenresResponse = { genres: Genre[] };

type CategoryKey = "all" | "saved" | "top" | "new" | "trending";
type SortKey = "updated" | "rating" | "title" | "trending";
type RatingKey = 0 | 4 | 4.5;

function safeNumber(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function buildQS(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && !v.trim()) return;
    if (Array.isArray(v) && v.length === 0) return;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default function StoriesPage() {
  const router = useRouter();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [stories, setStories] = useState<Story[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // UI
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [minRating, setMinRating] = useState<RatingKey>(0);
  const [sort, setSort] = useState<SortKey>("updated");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);

  // Pagination
  const [limit] = useState(12);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  function toggleGenre(key: string) {
    setSelectedGenres((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  async function fetchGenres() {
    try {
      const res = await fetch(api("/api/stories/genres"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as GenresResponse;
      if (!res.ok) return;
      setGenres((data.genres || []).filter((g) => g.key));
    } catch {
      // ignore
    }
  }

  async function fetchStories(reset = true) {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const qs = buildQS({
        q: q.trim() ? q.trim() : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        genres: selectedGenres.length ? selectedGenres : undefined,
        category: category !== "all" ? category : undefined,
        sort: sort !== "updated" ? sort : undefined,
        limit,
        offset: reset ? 0 : offset,
      });

      const res = await fetch(api(`/api/stories${qs}`), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as StoriesResponse;

      if (!res.ok) {
        setError((data as any)?.error || "Failed to load stories");
        if (reset) setStories([]);
        return;
      }

      const incoming = (data.stories || []).map((s: any) => ({
        id: String(s.id),
        title: String(s.title || ""),
        summary: String(s.summary || ""),
        avgRating: safeNumber(s.avgRating),
        saved: !!s.saved,
        coverImageUrl: s.coverImageUrl ?? null,
        genres: Array.isArray(s.genres) ? s.genres : [],
        updatedAt: s.updatedAt ?? null,
        runs7d: safeNumber(s.runs7d),
      })) as Story[];

      // ✅ Frontend fallback filters (in case backend doesn't filter correctly)
      let filteredIncoming = incoming;

      if (category === "saved") {
        filteredIncoming = filteredIncoming.filter((s) => s.saved === true);
      }

      if (category === "top") {
        filteredIncoming = filteredIncoming.filter((s) => (s.avgRating || 0) >= 4);
      }

      if (category === "new") {
        filteredIncoming = filteredIncoming.slice(0, limit);
      }

      if (category === "trending") {
        filteredIncoming = filteredIncoming
          .sort((a, b) => (b.runs7d || 0) - (a.runs7d || 0))
          .slice(0, limit);
      }

      // ✅ Rating fallback
      if (minRating > 0) {
        filteredIncoming = filteredIncoming.filter((s) => (s.avgRating || 0) >= minRating);
      }

      // total fallback
      const totalFromApi = safeNumber((data as any).total);
      const effectiveTotal =
        totalFromApi > 0
          ? totalFromApi
          : reset
          ? incoming.length
          : Math.max(total, offset + incoming.length);

      setTotal(effectiveTotal);

      if (reset) {
        setStories(filteredIncoming);
        setOffset(filteredIncoming.length);
      } else {
        setStories((prev) => [...prev, ...filteredIncoming]);
        setOffset((prev) => prev + filteredIncoming.length);
      }
    } catch {
      setError("Unable to fetch stories");
      if (reset) setStories([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    fetchGenres();
    fetchStories(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStories(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, minRating, sort, selectedGenres.join(",")]);

  async function toggleSave(story: Story) {
    const token = getToken();
    if (!token) {
      alert("Please log in to save stories");
      router.push("/login");
      return;
    }

    setBusyId(story.id);
    try {
      const res = await fetch(api(`/api/saved/${story.id}/save`), {
        method: story.saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert((data as any).error || "Unable to update saved status");
        return;
      }

      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, saved: !s.saved } : s))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRead(storyId: string) {
    const token = getToken();
    if (!token) {
      alert("Please log in to read");
      router.push("/login");
      return;
    }

    setBusyId(storyId);
    try {
      const res = await fetch(api(`/api/stories/${storyId}/start`), {
        method: "POST",
        headers: { ...authHeaders() },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert((data as any).error || "Unable to start story");
        return;
      }
      router.push(`/read/${(data as any).runId}`);
    } finally {
      setBusyId(null);
    }
  }

  const canLoadMore = total > 0 ? stories.length < total : false;
  const selectedCount = selectedGenres.length;

  if (loading) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">Loading stories…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">
            <div className="parchment-kicker">Stories</div>
            <div className="parchment-h1">Something went wrong</div>
            <p className="parchment-sub">{error}</p>

            <div className="primary-actions">
              <button className="btn-primary" onClick={() => fetchStories(true)}>
                Retry
              </button>
              <Link className="btn-ghost" href="/runs">
                Continue Reading
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="parchment-wrap">
      {/* ✅ Less padding on mobile */}
      <div className="parchment-shell-wide space-y-4 sm:space-y-6 px-3 sm:px-0">
        {/* ✅ Compact attractive header (small padding, mobile-friendly text) */}
        <div className="parchment-panel p-3 sm:p-6">
          <div className="panel-sticky space-y-3 sm:space-y-4">
            {/* Hero */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3 sm:p-5">
              <div className="parchment-kicker">Stories</div>
              <h1 className="text-[22px] sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Choose your next journey
              </h1>
              <p className="mt-1 text-[13px] sm:text-base text-slate-600 leading-relaxed">
                Filter by genre & rating. Trending uses real 7-day runs.
              </p>

              {/* ✅ Tabs: one line, swipeable on mobile */}
              <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                <Link className="tab-btn tab-btn-primary shrink-0" href="/stories">
                  Stories
                </Link>
                <Link className="tab-btn shrink-0" href="/saved">
                  Saved
                </Link>
                <Link className="tab-btn shrink-0" href="/runs">
                  Continue
                </Link>
                <Link className="tab-btn shrink-0" href="/premium">
                  Upgrade
                </Link>
              </div>
            </div>

            {/* ✅ Controls: stacked on mobile, no huge padding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or summary…"
                className="parchment-input text-sm py-2.5"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="parchment-select text-sm py-2.5"
              >
                <option value="updated">Recently Updated</option>
                <option value="rating">Top Rated</option>
                <option value="trending">Trending</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>

            {/* ✅ Chips: wrap + small text (mobile) */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`story-chip text-xs sm:text-sm ${category === "all" ? "chip-active" : ""}`}
                  onClick={() => setCategory("all")}
                  type="button"
                >
                  All
                </button>
                <button
                  className={`story-chip text-xs sm:text-sm ${category === "saved" ? "chip-active" : ""}`}
                  onClick={() => setCategory("saved")}
                  type="button"
                >
                  Saved
                </button>
                <button
                  className={`story-chip text-xs sm:text-sm ${category === "top" ? "chip-active" : ""}`}
                  onClick={() => setCategory("top")}
                  type="button"
                >
                  ⭐ Top
                </button>
                <button
                  className={`story-chip text-xs sm:text-sm ${category === "new" ? "chip-active" : ""}`}
                  onClick={() => setCategory("new")}
                  type="button"
                >
                  🆕 New
                </button>
                <button
                  className={`story-chip text-xs sm:text-sm ${category === "trending" ? "chip-active" : ""}`}
                  onClick={() => setCategory("trending")}
                  type="button"
                >
                  🔥 Trending
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-slate-500">
                  RATING
                </span>
                <button
                  className={`story-chip text-xs sm:text-sm ${minRating === 0 ? "chip-active" : ""}`}
                  onClick={() => setMinRating(0)}
                  type="button"
                >
                  All
                </button>
                <button
                  className={`story-chip text-xs sm:text-sm ${minRating === 4 ? "chip-active" : ""}`}
                  onClick={() => setMinRating(4)}
                  type="button"
                >
                  4+
                </button>
                <button
                  className={`story-chip text-xs sm:text-sm ${minRating === 4.5 ? "chip-active" : ""}`}
                  onClick={() => setMinRating(4.5)}
                  type="button"
                >
                  4.5+
                </button>
              </div>
            </div>

            {/* ✅ Genres: swipeable row on mobile (keeps space), wraps on desktop */}
            <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-slate-500">
                  GENRES
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500">
                  {stories.length} shown
                  {total > 0 && <span className="opacity-70"> / {total}</span>}
                </span>
              </div>

              <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                <button
                  type="button"
                  className={`story-chip text-xs sm:text-sm shrink-0 ${selectedCount === 0 ? "chip-active" : ""}`}
                  onClick={() => setSelectedGenres([])}
                >
                  All Genres
                </button>

                {genres.map((g) => {
                  const active = selectedGenres.includes(g.key);
                  return (
                    <button
                      key={g.key}
                      type="button"
                      className={`story-chip text-xs sm:text-sm shrink-0 ${active ? "chip-active" : ""}`}
                      onClick={() => toggleGenre(g.key)}
                      title={g.label}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {(q.trim() ||
                selectedCount > 0 ||
                category !== "all" ||
                minRating !== 0 ||
                sort !== "updated") && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    className="runs-clear text-sm"
                    onClick={() => {
                      setQ("");
                      setCategory("all");
                      setMinRating(0);
                      setSort("updated");
                      setSelectedGenres([]);
                    }}
                    type="button"
                  >
                    Reset filters
                  </button>

                  {selectedCount > 0 && (
                    <span className="text-[12px] text-slate-600">
                      Filtering by <b>{selectedCount}</b> genre{selectedCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Results */}
        {stories.length === 0 ? (
          <div className="parchment-panel p-3 sm:p-6">
            <div className="parchment-kicker">No results</div>
            <div className="parchment-h1">No stories match your filters</div>
            <p className="parchment-sub">Try removing filters or changing keywords.</p>
          </div>
        ) : (
          <>
            {/* ✅ Mobile: 1 column, Desktop: 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
              {stories.map((story) => {
                const rating = safeNumber(story.avgRating).toFixed(2);
                const busy = busyId === story.id;
                const g = (story.genres || []).slice(0, 3);

                return (
                  <div
                    key={story.id}
                    className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Cover */}
                    <div className="relative h-36 sm:h-44 bg-slate-50">
                      {story.coverImageUrl ? (
                        <img
                          src={story.coverImageUrl}
                          alt={story.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-3xl font-extrabold">
                            {story.title.slice(0, 1)}
                          </div>
                        </div>
                      )}

                      {/* Rating pill */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                          ⭐ <b>{rating}</b>
                        </span>
                      </div>
                    </div>

                    {/* Content (✅ less padding on mobile) */}
                    <div className="p-3 sm:p-5">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        <Link href={`/stories/${story.id}`} className="hover:underline">
                          {story.title}
                        </Link>
                      </h2>

                      <p className="mt-1 text-[13px] sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {story.summary}
                      </p>

                      {!!g.length && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {g.map((x) => (
                            <span
                              key={x.key}
                              className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                            >
                              {x.label}
                            </span>
                          ))}
                          {(story.genres || []).length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              +{(story.genres || []).length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* ✅ Mobile-friendly actions: full width buttons */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleRead(story.id)}
                          className="story-btn story-btn-primary text-sm py-2"
                          disabled={busy}
                          type="button"
                        >
                          {busy ? "Opening…" : "Read"}
                        </button>

                        <button
                          onClick={() => toggleSave(story)}
                          className={`story-btn text-sm py-2 ${
                            story.saved ? "story-btn-saved" : "story-btn-ghost"
                          }`}
                          disabled={busy}
                          type="button"
                        >
                          {story.saved ? "Saved ✓" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / load more (✅ compact) */}
            <div className="parchment-panel p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm text-slate-700">
                  Showing <b>{stories.length}</b>
                  {total > 0 ? (
                    <>
                      {" "}
                      of <b>{total}</b>
                    </>
                  ) : null}
                </div>

                {canLoadMore ? (
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={() => fetchStories(false)}
                    disabled={loadingMore}
                    type="button"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : (
                  <div className="text-sm text-slate-600">You reached the end ✅</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
