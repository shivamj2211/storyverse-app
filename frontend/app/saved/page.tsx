"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders } from "..//lib/api";

type SavedStory = {
  id: string;
  title: string;
  summary: string;
  avgRating: number | null;
};

export default function SavedPage() {
  const router = useRouter();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchSaved = async () => {
      setError(null);
      try {
        const res = await fetch(api("/api/saved"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to load saved stories");
          return;
        }

        setStories(data.saved || []);
      } catch {
        setError("Unable to fetch saved stories");
      } finally {
        setLoading(false);
      }
    };

    fetchSaved();
  }, [token]);

  const handleUnsave = async (storyId: string) => {
    if (!token) return;

    const res = await fetch(api(`/api/saved/${storyId}/save`), {
      method: "DELETE",
      headers: { ...authHeaders() },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Unable to remove");
      return;
    }

    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  // ===== UI states (same logic, new UI) =====

  if (!token) {
    return (
      <main className="parchment-page">
        <div className="parchment-shell">
          <section className="parchment-card">
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Storyverse Library
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
              Saved <span className="parchment-accent">Stories</span>
            </h1>
            <p className="mt-2 text-slate-700/80">
              Please log in to view your bookmarked stories.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="story-btn story-btn-primary px-5"
                onClick={() => router.push("/login")}
              >
                Go to Login
              </button>
              <Link
                href="/stories"
                className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
              >
                Browse Stories
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="parchment-page">
        <div className="parchment-shell">
          <section className="parchment-card">
            <p className="text-slate-700/75">Loading…</p>
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="parchment-page">
        <div className="parchment-shell">
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (stories.length === 0) {
    return (
      <main className="parchment-page">
        <div className="parchment-shell">
          <section className="parchment-card">
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Storyverse Library
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
              Saved <span className="parchment-accent">Stories</span>
            </h1>
            <p className="mt-2 text-slate-700/80">You have no saved stories.</p>

            <div className="mt-6">
              <Link
                href="/stories"
                className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
              >
                Browse Stories
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ===== Main list =====
  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Your Bookmarks
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              Saved <span className="parchment-accent">Stories</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              Your bookmarked stories — ready whenever you return.
            </p>
          </div>

          <Link
            href="/stories"
            className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
          >
            Back to Stories
          </Link>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-5">
          {stories.map((story) => (
            <section key={story.id} className="parchment-card">
              <div className="flex flex-wrap items-start justify-between gap-4 relative">
                <div className="min-w-0 w-full flex-1 sm:min-w-[240px]">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                      <Link
                        href={`/stories/${story.id}`}
                        className="hover:underline"
                      >
                        {story.title}
                      </Link>
                    </h2>

                    <span className="story-chip">SAVED</span>
                  </div>

                  <p className="mt-2 text-sm text-slate-700/80 leading-relaxed">
                    {story.summary}
                  </p>

                  <p className="mt-3 text-xs text-slate-700/70">
                    Avg Rating:{" "}
                    <span className="font-extrabold text-slate-900">
                      {Number(story.avgRating || 0).toFixed(2)}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="story-actions flex">
                  <button
                    onClick={async () => {
                      const res = await fetch(api(`/api/stories/${story.id}/start`), {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...authHeaders(),
                        },
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        alert(data.error || "Could not start run.");
                        return;
                      }
                      router.push(`/read/${data.runId}`);
                    }}
                    className="story-btn story-btn-primary px-5"
                  >
                    Read
                  </button>

                  <Link
                    href={`/stories/${story.id}`}
                    className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
                  >
                    Details
                  </Link>

                  <button
                    onClick={() => handleUnsave(story.id)}
                    className="story-btn px-5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 parchment-note text-center">
          Tip: Save stories you love — your library will remember them.
        </div>
      </div>
    </main>
  );
}
