"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "..//lib/api";

interface Run {
  id: string;
  storyTitle: string;
  isCompleted: boolean;
}

interface JourneyInfo {
  currentStep: number;
  totalSteps: number;
}

export default function LibraryPage() {
  const router = useRouter();
  const token = getToken();
  const [runs, setRuns] = useState<Run[]>([]);
  const [journeyMap, setJourneyMap] = useState<Record<string, JourneyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchRuns = async () => {
      try {
        const res = await fetch(api("/api/runs"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load runs");
          setLoading(false);
          return;
        }

        setRuns(data.runs || []);

        (data.runs || []).forEach(async (run: Run) => {
          try {
            const jr = await fetch(api(`/api/runs/${run.id}/journey`), {
              headers: { ...authHeaders() },
            });
            const jd = await jr.json();
            if (jr.ok) {
              setJourneyMap((prev) => ({
                ...prev,
                [run.id]: { currentStep: jd.currentStep, totalSteps: jd.totalSteps },
              }));
            }
          } catch {
            // ignore
          }
        });
      } catch {
        setError("Unable to fetch runs");
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [token]);

  // ===== UI ONLY (same logic) =====
  if (!token) {
    return (
      <main className="parchment-page">
        <div className="parchment-shell">
          <section className="parchment-card">
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Your Shelf
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
              Continue <span className="parchment-accent">Reading</span>
            </h1>
            <p className="mt-2 text-slate-700/80">
              Please log in to view your library and resume runs.
            </p>

            <div className="mt-6">
              <button
                className="story-btn story-btn-primary px-6"
                onClick={() => router.push("/login")}
              >
                Go to Login
              </button>
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

  if (runs.length === 0) {
    return (
      <main className="parchment-page">
        <div className="parchment-shell">
          <section className="parchment-card">
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Your Shelf
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
              Your <span className="parchment-accent">Library</span>
            </h1>
            <p className="mt-2 text-slate-700/80">You have no runs yet.</p>

            <div className="mt-6">
              <button
                className="story-btn story-btn-ghost px-6"
                onClick={() => router.push("/stories")}
              >
                Browse Stories
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        {/* Header */}
        <div className="mb-6">
          <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
            Your Shelf
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
            Continue <span className="parchment-accent">Reading</span>
          </h1>
          <p className="mt-2 text-sm text-slate-700/80">
            Pick up exactly where you left off.
          </p>
        </div>

        {/* Runs list */}
        <div className="grid grid-cols-1 gap-5">
          {runs.map((run) => {
            const journey = journeyMap[run.id];
            const total = journey?.totalSteps ?? 5;
            const current = journey?.currentStep ?? (run.isCompleted ? total : 1);
            const pct = Math.max(0, Math.min(100, (current / total) * 100));

            return (
              <section key={run.id} className="run-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 w-full flex-1 sm:min-w-[260px]">

                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                        {run.storyTitle}
                      </h2>

                      <span className="story-chip">
                        {run.isCompleted ? "COMPLETED" : "IN PROGRESS"}
                      </span>
                    </div>

                    <div className="run-meta">
                      Status:{" "}
                      {run.isCompleted
                        ? "Completed"
                        : journey
                        ? `Step ${journey.currentStep} / ${journey.totalSteps}`
                        : "In progress"}
                    </div>

                    <div className="run-progress" aria-hidden="true">
                      <span style={{ width: `${run.isCompleted ? 100 : pct}%` }} />
                    </div>
                  </div>

                  <div className="story-actions flex">
                    <button
                      onClick={() => router.push(`/read/${run.id}`)}
                      className="story-btn story-btn-primary px-6"
                    >
                      Continue Reading
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 parchment-note text-center">
          Your progress is saved automatically after every step.
        </div>
      </div>
    </main>
  );
}