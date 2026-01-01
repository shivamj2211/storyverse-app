"use client";

import React, { useEffect, useMemo, useState } from "react";
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
        // basic fallback: keep newest-ish order from backend and show first page only
        // (better if backend provides createdAt/updatedAt)
        filteredIncoming = filteredIncoming.slice(0, limit);
      }

      if (category === "trending") {
        filteredIncoming = filteredIncoming
          .sort((a, b) => (b.runs7d || 0) - (a.runs7d || 0))
          .slice(0, limit);
      }
            // ✅ Rating fallback (IMPORTANT)
      if (minRating > 0) {
        filteredIncoming = filteredIncoming.filter((s) => (s.avgRating || 0) >= minRating);
      }


           // total fallback: if backend doesn't send total, use count we have
        const totalFromApi = safeNumber((data as any).total);
        const effectiveTotal = totalFromApi > 0 ? totalFromApi : (reset ? incoming.length : Math.max(total, offset + incoming.length));

        setTotal(effectiveTotal);
        const canLoadMore = total > 0 ? stories.length < total : false;

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

  // Initial load
  useEffect(() => {
    fetchGenres();
    fetchStories(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters change (reset pagination)
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

  const canLoadMore = stories.length < total;

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

  const selectedCount = selectedGenres.length;

  return (
    <main className="parchment-wrap">
      <div className="parchment-shell-wide space-y-6">
        <div className="parchment-panel">
          <div className="panel-sticky">
            <div className="parchment-kicker">Stories</div>
            <div className="parchment-h1">Choose your next journey</div>
            <p className="parchment-sub">
              Filter by genre & rating. Trending uses real 7-day runs.
            </p>

            <div className="tab-row">
              <Link className="tab-btn tab-btn-primary" href="/stories">
                Stories
              </Link>
              <Link className="tab-btn" href="/saved">
                Saved
              </Link>
              <Link className="tab-btn" href="/runs">
                Continue Reading
              </Link>
              <Link className="tab-btn" href="/premium">
                Upgrade
              </Link>
            </div>

            <div className="parchment-controls">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search stories by title or summary…"
                className="parchment-input"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="parchment-select"
              >
                <option value="updated">Recently Updated</option>
                <option value="rating">Top Rated</option>
                <option value="trending">Trending</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>

            <div className="stories-toolbar">
              <div className="stories-pills">
                <button
                  className={`story-chip ${category === "all" ? "chip-active" : ""}`}
                  onClick={() => setCategory("all")}
                  type="button"
                >
                  All
                </button>
                <button
                  className={`story-chip ${category === "saved" ? "chip-active" : ""}`}
                  onClick={() => setCategory("saved")}
                  type="button"
                >
                  Saved
                </button>
                <button
                  className={`story-chip ${category === "top" ? "chip-active" : ""}`}
                  onClick={() => setCategory("top")}
                  type="button"
                >
                  ⭐ Top Rated
                </button>
                <button
                  className={`story-chip ${category === "new" ? "chip-active" : ""}`}
                  onClick={() => setCategory("new")}
                  type="button"
                >
                  🆕 New
                </button>
                <button
                  className={`story-chip ${category === "trending" ? "chip-active" : ""}`}
                  onClick={() => setCategory("trending")}
                  type="button"
                >
                  🔥 Trending
                </button>
              </div>

              <div className="stories-pills">
                <span className="stories-small-label">Rating</span>
                <button
                  className={`story-chip ${minRating === 0 ? "chip-active" : ""}`}
                  onClick={() => setMinRating(0)}
                  type="button"
                >
                  All
                </button>
                <button
                  className={`story-chip ${minRating === 4 ? "chip-active" : ""}`}
                  onClick={() => setMinRating(4)}
                  type="button"
                >
                  4+
                </button>
                <button
                  className={`story-chip ${minRating === 4.5 ? "chip-active" : ""}`}
                  onClick={() => setMinRating(4.5)}
                  type="button"
                >
                  4.5+
                </button>
              </div>
            </div>

            <div className="stories-genres">
              <div className="stories-genres-head">
                <span className="stories-small-label">Genres</span>
                <span className="stories-count">
                  {stories.length} shown
                  {total > 0 && <span className="stories-count-muted"> / {total}</span>}
                </span>
              </div>

              <div className="stories-genre-chips">
                <button
                  type="button"
                  className={`story-chip ${selectedCount === 0 ? "chip-active" : ""}`}
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
                      className={`story-chip ${active ? "chip-active" : ""}`}
                      onClick={() => toggleGenre(g.key)}
                      title={g.label}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {(q.trim() || selectedCount > 0 || category !== "all" || minRating !== 0 || sort !== "updated") && (
                <div className="stories-reset-row">
                  <button
                    className="runs-clear"
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
                    <span className="stories-small-hint">
                      Filtering by <b>{selectedCount}</b> genre{selectedCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="parchment-panel">
            <div className="parchment-kicker">No results</div>
            <div className="parchment-h1">No stories match your filters</div>
            <p className="parchment-sub">Try removing filters or changing keywords.</p>
          </div>
        ) : (
          <>
            <div className="story-grid story-grid-2col">
              {stories.map((story) => {
                const rating = safeNumber(story.avgRating).toFixed(2);
                const busy = busyId === story.id;
                const g = (story.genres || []).slice(0, 3);

                return (
                  <div key={story.id} className="story-grid-card">
                    <div className="story-cover">
                      {story.coverImageUrl ? (
                        <img
                          src={story.coverImageUrl}
                          alt={story.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="story-cover-fallback">
                          <span>{story.title.slice(0, 1)}</span>
                        </div>
                      )}
                    </div>


                    <div className="p-6">
                      <div className="story-card-top">
                        <div className="min-w-0">
                          <h2 className="story-card-title">
                            <Link href={`/stories/${story.id}`}>{story.title}</Link>
                          </h2>
                          <p className="story-card-summary">{story.summary}</p>
                        </div>

                        <span className="story-chip">
                          ⭐ <b>{rating}</b>
                        </span>
                      </div>

                      {!!g.length && (
                        <div className="story-genre-preview">
                          {g.map((x) => (
                            <span key={x.key} className="story-mini-chip">
                              {x.label}
                            </span>
                          ))}
                          {(story.genres || []).length > 3 && (
                            <span className="story-mini-more">
                              +{(story.genres || []).length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="story-actions mt-5 flex gap-2">
                        <button
                          onClick={() => handleRead(story.id)}
                          className="story-btn story-btn-primary"
                          disabled={busy}
                          type="button"
                        >
                          {busy ? "Opening…" : "Read"}
                        </button>

                        <button
                          onClick={() => toggleSave(story)}
                          className={`story-btn ${story.saved ? "story-btn-saved" : "story-btn-ghost"}`}
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

            <div className="parchment-panel" style={{ padding: 22 }}>
              <div className="primary-actions" style={{ justifyContent: "space-between", width: "100%" }}>
                <div className="parchment-sub">
                  Showing <b>{stories.length}</b> of <b>{total}</b>
                </div>

                {canLoadMore ? (
                  <button
                    className="btn-primary"
                    onClick={() => fetchStories(false)}
                    disabled={loadingMore}
                    type="button"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : (
                  <div className="parchment-sub">You reached the end ✅</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
