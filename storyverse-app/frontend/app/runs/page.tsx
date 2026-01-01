"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders } from "..//lib/api";

type RunItem = {
  id: string;
  storyId?: string;
  storyTitle: string;
  isCompleted: boolean;
  startedAt: string;
  updatedAt: string;
};

type RunsResponse = { runs: RunItem[] };

type MePayload = {
  user: { plan: "free" | "premium" | "creator"; coins: number };
};

type SortKey =
  | "updated_desc"
  | "updated_asc"
  | "completed_first"
  | "inprogress_first"
  | "title_az";

function fmt(dt: string) {
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [journeyMap, setJourneyMap] = useState<Record<string, { currentStep: number; totalSteps: number }>>({});
  const [mePlan, setMePlan] = useState<"free" | "premium" | "creator">("free");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function fetchMe() {
    try {
      const res = await fetch(api("/api/auth/me"), { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const data = (await res.json()) as MePayload;
      setMePlan(data.user.plan);
    } catch {}
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchRuns = async () => {
      setError(null);
      setLoading(true);
      try {
        await fetchMe();

        const res = await fetch(api("/api/runs"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });

        const data = (await res.json().catch(() => ({}))) as RunsResponse;
        if (!res.ok) {
          setError((data as any).error || "Failed to load runs");
          return;
        }

        const list = data.runs || [];
        setRuns(list);

        // progress for in-progress runs
        list.forEach(async (run) => {
          if (run.isCompleted) return;
          try {
            const jr = await fetch(api(`/api/runs/${run.id}/journey`), { headers: { ...authHeaders() } });
            const jd = await jr.json();
            if (jr.ok) {
              setJourneyMap((prev) => ({
                ...prev,
                [run.id]: { currentStep: jd.currentStep, totalSteps: jd.totalSteps },
              }));
            }
          } catch {}
        });
      } catch {
        setError("Network error while loading runs");
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [token]);

  const filteredSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = runs.filter((r) => !needle || r.storyTitle.toLowerCase().includes(needle));

    list = [...list].sort((a, b) => {
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();

      if (sort === "updated_desc") return bUpdated - aUpdated;
      if (sort === "updated_asc") return aUpdated - bUpdated;

      if (sort === "completed_first") {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
        return bUpdated - aUpdated;
      }
      if (sort === "inprogress_first") {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return bUpdated - aUpdated;
      }
      return a.storyTitle.localeCompare(b.storyTitle);
    });

    return list;
  }, [runs, q, sort]);

  function percent(run: RunItem) {
  if (run.isCompleted) return 100;
  const j = journeyMap[run.id];
  if (!j) return 0;
  const total = j.totalSteps || 5;
  const step = j.currentStep || 1;
  return Math.max(0, Math.min(100, Math.round(((step - 1) / total) * 100)));
}


  const isPremiumLike = mePlan === "premium" || mePlan === "creator";

  async function replay(run: RunItem) {
    if (!run.isCompleted) return;

    if (!isPremiumLike) {
      router.push("/premium"); // locked → upsell
      return;
    }

    if (!run.storyId) {
      alert("Replay needs storyId from backend (/api/runs must return storyId).");
      return;
    }

    setBusyId(run.id);
    try {
      const res = await fetch(api(`/api/stories/${run.storyId}/start`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Could not start replay.");
        return;
      }
      router.push(`/read/${data.runId}`);
    } catch {
      alert("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  if (!token) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">
            <div className="parchment-kicker">Library</div>
            <div className="parchment-h1">Continue Reading</div>
            <p className="parchment-sub">Please log in to view your runs.</p>
            <div className="primary-actions">
              <button className="btn-primary" onClick={() => router.push("/login")}>Go to Login</button>
              <Link className="btn-ghost" href="/stories">Browse Stories</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">Loading…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide">
          <div className="parchment-panel">
            <div className="storyverse-error">{error}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="parchment-wrap">
      <div className="parchment-shell-wide space-y-6">
        {/* Header */}
        <div className="parchment-panel">
        <div className="panel-sticky">
          <div className="parchment-kicker">Library</div>
          <div className="parchment-h1">Continue Reading</div>
          <p className="parchment-sub">Resume your story journeys.</p>

          <div className="tab-row">
            <Link className="tab-btn" href="/stories">Stories</Link>
            <Link className="tab-btn" href="/saved">Saved</Link>
            <Link className="tab-btn tab-btn-primary" href="/premium">Upgrade</Link>
          </div>

          <div className="parchment-controls">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your runs…"
              className="parchment-input"
            />
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="parchment-select">
              <option value="updated_desc">Newest Updated</option>
              <option value="updated_asc">Oldest Updated</option>
              <option value="completed_first">Completed First</option>
              <option value="inprogress_first">In-Progress First</option>
              <option value="title_az">Title A–Z</option>
            </select>
          </div>
        </div>
        <div style={{ height: 10 }} />

      </div>


        {/* Cards */}
        <div className="space-y-4">
          {filteredSorted.map((r) => {
            const j = journeyMap[r.id];
            const p = percent(r);

            return (
              <div key={r.id} className="run-card">
               <div className="run-row">
                {/* LEFT: Content */}
                <div className="run-left">
                  <div className="run-title">{r.storyTitle}</div>

                  <div className="run-meta">
                    Status: <b>{r.isCompleted ? "Completed" : "In Progress"}</b>
                    {r.isCompleted
                      ? " • Last chapter: 5/5"
                      : j
                        ? ` • Last read: ${j.currentStep}/${j.totalSteps}`
                        : ""}
                    <br />
                    Updated: <b>{fmt(r.updatedAt)}</b>
                  </div>

                  <div className="run-progress" aria-label="progress">
                    <span style={{ width: `${p}%` }} />
                  </div>

                  <div className="run-progress-text">Progress: {p}%</div>

                  {/* Replay row should be in LEFT area so it aligns nicely */}
                  {r.isCompleted && (
                    <div className="run-replay-area">
                      <button
                        className={`btn-wax ${!isPremiumLike ? "btn-lock" : ""}`}
                        onClick={() => replay(r)}
                        disabled={busyId === r.id || !isPremiumLike}
                        type="button"
                      >
                        🔁 Replay
                      </button>

                      {!isPremiumLike && (
                        <div className="replay-msg">
                          <b>Journey finished</b> — you can explore other stories or replay from it
                          by becoming the <b>Premium</b> or <b>Creator</b> user.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT: Actions */}
                <div className="run-right">
                  {r.isCompleted && <span className="badge-sealed">✅ Sealed</span>}

                  <button
                    className="btn-primary"
                    onClick={() => router.push(`/read/${r.id}`)}
                    disabled={busyId === r.id}
                    type="button"
                  >
                    {r.isCompleted ? "Explore" : "Resume"}
                  </button>
                </div>
              </div>

              </div>
            );
          })}
        </div>

        {filteredSorted.length === 0 && (
          <div className="parchment-panel">
            <div className="parchment-kicker">No results</div>
            <p className="parchment-sub">Try a different search or sorting.</p>
          </div>
        )}
      </div>
    </main>
  );
}
