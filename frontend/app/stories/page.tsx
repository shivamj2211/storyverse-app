"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders } from "..//lib/api";

type Story = {
  id: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  saved?: boolean;
};

type StoriesResponse = { stories: Story[] };

export default function StoriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  async function fetchStories() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(api("/api/stories"), {
        headers: { ...authHeaders() }, // optional auth (saved flag)
        cache: "no-store",
      });

      const data = (await res.json().catch(() => ({}))) as StoriesResponse;

      if (!res.ok) {
        console.error(data);
        setError((data as any)?.error || "Failed to load stories.");
        return;
      }

      setStories(data.stories ?? []);
    } catch (e) {
      console.error(e);
      setError("Network error while loading stories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSave(storyId: string, saved: boolean | undefined) {
    if (!token) {
      alert("Please login to save stories.");
      router.push("/login");
      return;
    }

    setBusyId(storyId);
    try {
      const res = await fetch(api(`/api/saved/${storyId}/save`), {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(data);
        alert(data.error || "Save failed. Please try again.");
        return;
      }

      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, saved: !saved } : s))
      );
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function startRun(storyId: string) {
    if (!token) {
      alert("Please login to start reading.");
      router.push("/login");
      return;
    }

    setBusyId(storyId);
    try {
      const res = await fetch(api(`/api/stories/${storyId}/start`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });

      const data = (await res.json().catch(() => ({}))) as { runId?: string; error?: string };

      if (!res.ok || !data.runId) {
        console.error(data);
        alert(data.error || "Could not start run. Please try again.");
        return;
      }

      router.push(`/read/${data.runId}`);
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                Storyverse Library
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
                Choose a <span className="parchment-accent">story</span>
              </h1>
              <p className="mt-2 text-sm text-slate-700/80 max-w-2xl">
                Pick a story and start your 5-step journey. Designed like a book —
                easy on the eyes, built for reading.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/saved"
                className="story-btn story-btn-ghost px-4 inline-flex items-center justify-center"
              >
                Saved
              </Link>
              <Link
                href="/runs"
                className="story-btn story-btn-ghost px-4 inline-flex items-center justify-center"
              >
                Continue Reading
              </Link>
            </div>
          </div>

          {loading && <p className="mt-5 text-slate-700/70">Loading…</p>}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <div className="mt-6 parchment-note">
              No stories found. Run your seed SQL to insert test stories.
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="story-grid grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 ">
          {stories.map((s) => (
            <div key={s.id} className="story-grid-card">
              <div className="story-cover">
                {s.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.coverImageUrl} alt={s.title} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-sm text-slate-700/70">
                      No cover • Storyverse
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between gap-2">
  <h2 className="min-w-0 truncate whitespace-nowrap text-lg font-extrabold leading-snug text-slate-900">
    {s.title}
    {/* optional meta example:
    <span className="ml-1 font-normal text-slate-700/70">(5 Steps, 76 Branches)</span>
    */}
  </h2>

  <span
    className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-700"
  >
    {s.saved ? "SAVED" : "NEW"}
  </span>
                  </div>


                <p className="mt-3 text-sm text-slate-700/80 leading-relaxed line-clamp-3">
                  {s.summary}
                </p>

                <div className="story-actions flex w-full items-center gap-2 flex-nowrap">
  <button
    className="story-btn story-btn-primary flex-1 min-w-0 whitespace-nowrap !px-3 !py-2 text-xs sm:text-sm sm:!px-4"
    onClick={() => startRun(s.id)}
    disabled={busyId === s.id}
  >
    {busyId === s.id ? "Starting…" : "Read"}
  </button>

  <button
    className="story-btn flex-1 min-w-0 whitespace-nowrap !px-3 !py-2 text-xs sm:text-sm sm:!px-4"
    onClick={() => toggleSave(s.id, s.saved)}
    disabled={busyId === s.id}
  >
    {s.saved ? "Saved ✓" : "Save"}
  </button>

  <Link
    href={`/stories/${s.id}`}
    className="story-btn story-btn-ghost flex-1 min-w-0 whitespace-nowrap !px-3 !py-2 text-xs sm:text-sm sm:!px-4 inline-flex items-center justify-center"
  >
    Details
  </Link>
</div>

              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 parchment-note text-center">
          Tip: Save stories you love — your library will remember them.
        </div>
      </div>
    </main>
  );
}
