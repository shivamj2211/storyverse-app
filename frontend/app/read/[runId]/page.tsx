"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import JourneyStepper from "../../../components/JourneyStepper";
import { api, authHeaders } from "../..//lib/api";

type Choice = {
  genreKey: string;
  toNodeId: string;
  avgRating: string | null;
};

type CurrentNodePayload = {
  storyId?: string;
  node: {
    id: string;
    title: string;
    content: string;
    stepNo: number;
    isStart: boolean;
  };
  ratingSubmitted: boolean;
  choices: Choice[];
  isCompleted: boolean;
};

type JourneyPayload = {
  totalSteps: number;
  currentStep: number;
  picked: { stepNo: number; genreKey: string }[];
  isCompleted: boolean;
};

type SummaryPayload = {
  isCompleted: boolean;
  totalSteps: number;
  finalJourneyRating: number | null;
};

type MePayload = {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    full_name: string | null;
    age: number | null;
    coins: number;
    plan: "free" | "premium" | "creator";
    is_premium?: boolean;
  };
};

function WhatsAppShareLink(text: string, url: string) {
  const msg = encodeURIComponent(`${text}\n${url}`);
  return `https://wa.me/?text=${msg}`;
}

export default function ReadRunPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [paywalled, setPaywalled] = useState<{
    chapterNumber: number;
    available: number;
    requiredCoins: number;
    error: string;
  } | null>(null);

  const [me, setMe] = useState<MePayload["user"] | null>(null);

  const [current, setCurrent] = useState<CurrentNodePayload | null>(null);
  const [journey, setJourney] = useState<JourneyPayload | null>(null);

  const [rating, setRating] = useState<number | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [coinsAwardedLast, setCoinsAwardedLast] = useState<number>(0);

  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);

  const totalSteps = journey?.totalSteps ?? 5;
  const currentStep = journey?.currentStep ?? current?.node.stepNo ?? 1;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin + "/stories";
  }, []);

  // feedback
  const [fbRating, setFbRating] = useState<number>(0);
  const [fbText, setFbText] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbErr, setFbErr] = useState("");

  async function submitFeedback() {
    setFbErr("");
    try {
      const res = await fetch(api(`/api/runs/${runId}/feedback`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ rating: fbRating || null, feedback: fbText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFbErr(data?.error || "Failed to submit feedback");
        return;
      }
      setFbSent(true);
    } catch (e) {
      console.error(e);
      setFbErr("Network error");
    }
  }

  async function fetchMe() {
    try {
      const res = await fetch(api("/api/auth/me"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as MePayload;
      setMe(data.user);
    } catch {
      // ignore
    }
  }

  async function fetchJourney() {
    const res = await fetch(api(`/api/runs/${runId}/journey`), {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch journey");
    const data = (await res.json()) as JourneyPayload;
    setJourney(data);
  }

  async function fetchCurrent() {
    setPaywalled(null);
    setSummary(null);

    const res = await fetch(api(`/api/runs/${runId}/current`), {
      headers: { ...authHeaders() },
      cache: "no-store",
    });

    if (res.status === 403) {
      const data = await res.json();

      if (data?.code === "CHAPTER_LOCKED") {
        // ✅ Always refresh /me so coin UI is accurate
        await fetchMe();

        setPaywalled({
          chapterNumber: Number(data.chapterNumber ?? 3),
          requiredCoins: Number(data.requiredCoins ?? 100),
          available: Number(data.available ?? 0),
          error: `Chapter ${data.chapterNumber} is locked. Use coins to unlock or go Premium.`,
        });
        return;
      }
    }

    if (!res.ok) {
      throw new Error("Failed to fetch current node");
    }

    const data = (await res.json()) as CurrentNodePayload;
    setCurrent(data);
    setRatingSubmitted(!!data.ratingSubmitted);
    setRating(null);
  }

  async function unlockWithCoins() {
    if (!paywalled) return;

    const chapter = paywalled.chapterNumber;

    try {
      const res = await fetch(api(`/api/runs/${runId}/unlock`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ chapterNumber: chapter }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        if (data?.error === "INSUFFICIENT_COINS") {
          alert(`Insufficient coins. Available: ${data.available}, Required: ${data.required}`);
          await fetchMe();
          setPaywalled((p) =>
            p ? { ...p, available: Number(data.available ?? p.available) } : p
          );
        } else {
          alert(data?.error || "Unlock failed");
        }
        return;
      }

      // ✅ refresh coins + journey
      await fetchMe();
      await fetchJourney();

      // ✅ Important: clear paywall then fetch current node again
      setPaywalled(null);
      await fetchCurrent();
    } catch (e) {
      console.error(e);
      alert("Unlock failed due to network error");
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      await fetchMe();
      await fetchJourney();
      await fetchCurrent();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!runId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  async function submitRating() {
    if (!current?.node?.id) return;
    if (!rating) {
      alert("Please select a rating (1 to 5).");
      return;
    }

    try {
      const res = await fetch(api(`/api/runs/${runId}/rate`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: current.node.id, rating }),
      });

      if (!res.ok) {
        const msg = await res.text();
        console.error("RATE ERROR:", msg);
        alert(msg || "Rating failed. Please try again.");
        return;
      }

      const data = (await res.json()) as { ok: boolean; coinsAwarded?: number };
      setRatingSubmitted(true);
      setCoinsAwardedLast(data.coinsAwarded ?? 0);

      await fetchMe();
    } catch (e) {
      console.error(e);
      alert("Rating failed due to network error.");
    }
  }

  async function chooseGenre(genreKey: string) {
    if (!current) return;

    if (!ratingSubmitted && !current.node.isStart) {
      alert("Please rate before choosing.");
      return;
    }

    try {
      const res = await fetch(api(`/api/runs/${runId}/choose`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ genreKey }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          const data = await res.json();
          await fetchMe();

          if (data?.code === "CHAPTER_LOCKED") {
            setPaywalled({
              chapterNumber: Number(data.chapterNumber ?? 3),
              requiredCoins: Number(data.requiredCoins ?? 100),
              available: Number(data.available ?? 0),
              error: `Chapter ${data.chapterNumber} is locked. Use coins to unlock or go Premium.`,
            });
            return;
          }
        }

        const msg = await res.text();
        console.error(msg);
        alert("Could not proceed. Please try again.");
        return;
      }

      const data = (await res.json()) as CurrentNodePayload;
      setCurrent(data);
      setRatingSubmitted(!!data.ratingSubmitted);
      setRating(null);
      setCoinsAwardedLast(0);

      await fetchJourney();
    } catch (e) {
      console.error(e);
      alert("Network error.");
    }
  }

  async function finishJourney() {
    if (!current) return;
    if (current.node.stepNo < 5) return;

    if (!ratingSubmitted) {
      alert("Please rate the final chapter before finishing.");
      return;
    }

    setFinishing(true);
    try {
      const res = await fetch(api(`/api/runs/${runId}/finish`), {
        method: "POST",
        headers: { ...authHeaders() },
      });

      if (!res.ok) {
        const msg = await res.text();
        console.error(msg);
        alert("Finish failed. Please try again.");
        return;
      }

      const sRes = await fetch(api(`/api/runs/${runId}/summary`), {
        headers: { ...authHeaders() },
      });
      if (!sRes.ok) throw new Error("Failed to load summary");
      const sData = (await sRes.json()) as SummaryPayload;
      setSummary(sData);

      await fetchJourney();
    } catch (e) {
      console.error(e);
      alert("Finish failed due to network error.");
    } finally {
      setFinishing(false);
    }
  }

  async function handleShare() {
    const text = "I’m reading a Storyverse journey. Check it out!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Storyverse", text, url: shareUrl });
        return;
      }
    } catch {
      // ignore
    }

    window.open(WhatsAppShareLink(text, shareUrl), "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied!");
    } catch {
      alert("Copy failed. You can manually copy the URL from browser.");
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="text-slate-600">Loading…</div>
      </main>
    );
  }

  // Paywall view
  if (paywalled) {
    const shownCoins = Number.isFinite(Number(me?.coins))
      ? Number(me?.coins)
      : Number(paywalled.available ?? 0);

    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide space-y-6">
          <JourneyStepper totalSteps={5} currentStep={paywalled.chapterNumber} picked={journey?.picked ?? []} />

          <section className="parchment-panel">
            <div className="parchment-kicker">Locked</div>
            <h1 className="parchment-h1">🔒 Locked Chapter</h1>
            <p className="parchment-sub">{paywalled.error}</p>

            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Your Available Coins</div>
                <div className="stat-value">{shownCoins}</div>
                <div className="stat-note">Coins are added when you rate chapters</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Required to Unlock</div>
                <div className="stat-value">{paywalled.requiredCoins}</div>
                <div className="stat-note">Unlock Chapter 3+ without Premium</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Tip</div>
                <div className="stat-value">Rate</div>
                <div className="stat-note">Earn coins by rating each chapter</div>
              </div>
            </div>

            <div className="primary-actions">
              <button
                className="btn-primary"
                onClick={unlockWithCoins}
                disabled={shownCoins < paywalled.requiredCoins}
                type="button"
              >
                Unlock with {paywalled.requiredCoins} coins
              </button>

              <button className="btn-primary" onClick={() => router.push("/premium")} type="button">
                Go Premium
              </button>

              <button className="btn-ghost" onClick={() => router.push("/wallet")} type="button">
                View Wallet
              </button>

              <button className="btn-ghost" onClick={() => router.push("/stories")} type="button">
                Back to Stories
              </button>
            </div>

            <div className="wallet-tip">
              <div className="callout-title">Fast unlock</div>
              <div className="callout-text">
                Rate stories → coins go to your wallet → when wallet coins are{" "}
                <b>≥ {paywalled.requiredCoins}</b>, you can read Chapter 3+ on Free plan.
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Congrats view
  if (summary?.isCompleted) {
    const unlockAt = 100;

    return (
      <main className="parchment-wrap">
        <div className="parchment-shell-wide space-y-6">
          <JourneyStepper totalSteps={summary.totalSteps ?? 5} currentStep={5} picked={journey?.picked ?? []} />

          <section className="parchment-panel">
            <div className="parchment-kicker">Journey Completed</div>
            <h1 className="parchment-h1">🎉 Congratulations!</h1>
            <p className="parchment-sub">
              You finished all <b>5 steps</b>. Your final journey rating is the average of your chapter ratings.
              <br />
              Any coins you earned are now added to your <b>wallet</b>.
            </p>

            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Final Journey Rating</div>
                <div className="stat-value">{summary.finalJourneyRating ?? "—"}</div>
                <div className="stat-note">Based on your ratings for this run</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Wallet Coins</div>
                <div className="stat-value">{me?.coins ?? "—"}</div>
                <div className="stat-note">
                  Unlock Chapter 3+ at <b>{unlockAt} coins</b> (Free plan)
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Plan</div>
                <div className="stat-value">{me?.plan?.toUpperCase?.() ?? "FREE"}</div>
                <div className="stat-note">Premium removes limits • Creator includes Premium</div>
              </div>
            </div>

            <div className="callout-box">
              <div className="callout-title">Unlock tip</div>
              <div className="callout-text">
                Free users can read <b>Chapters 1–2</b> for free. Chapters <b>3–5</b> require{" "}
                <b>{unlockAt} coins each</b> to unlock (or go Premium).
              </div>
            </div>

            <div className="primary-actions">
              <button className="btn-primary" onClick={handleShare} type="button">
                Share Journey
              </button>

              <button className="btn-ghost" onClick={copyLink} type="button">
                Copy Link
              </button>

              <button className="btn-ghost" onClick={() => router.push("/stories")} type="button">
                Back to Stories
              </button>

              <button className="btn-ghost" onClick={() => router.push("/runs")} type="button">
                Go to Library
              </button>
            </div>

            <div className="hr-ink" />

            <section className="parchment-panel">
              <div className="parchment-kicker">Feedback</div>
              <h2 className="parchment-h1" style={{ fontSize: "1.2rem" }}>
                ⭐ Rate this journey
              </h2>
              <p className="parchment-sub">Your feedback helps us improve Storyverse.</p>

              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`rating-pill ${fbRating >= n ? "rating-pill-selected" : ""}`}
                    onClick={() => setFbRating(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <textarea
                className="mt-3 w-full rounded-lg border border-slate-200 p-2 text-sm"
                rows={3}
                placeholder="What did you like? What should improve?"
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
              />

              {fbErr ? <div className="mt-2 text-sm text-red-600">{fbErr}</div> : null}
              {fbSent ? <div className="mt-2 text-sm text-green-700">Thanks! Feedback saved.</div> : null}

              <button className="btn-primary mt-3" onClick={submitFeedback} disabled={fbSent} type="button">
                Submit Feedback
              </button>
            </section>

            <div className="callout-box">
              <div className="callout-title">✍️ Write for Storyverse</div>
              <div className="callout-text">
                If you write stories, email us at <b>writers@storyverse.com</b>. We review submissions, publish
                selected stories, and pay you based on story performance. We only take a commission from earnings.
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Normal reading view
  return (
    <main className="reading-page">
      <div className="reading-shell space-y-6">
        <JourneyStepper totalSteps={totalSteps} currentStep={currentStep} picked={journey?.picked ?? []} />

        <article className="reading-card">
          <header>
            <h1 className="reading-title">{current?.node.title ?? "Chapter"}</h1>
            <div className="reading-meta">
              Chapter {current?.node.stepNo ?? "—"} of {totalSteps} · Coins <b>{me?.coins ?? "—"}</b>{" "}
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {me?.plan?.toUpperCase?.() ?? "FREE"}
              </span>
            </div>
          </header>

          <section className="reading-content">{current?.node.content ?? ""}</section>

          <div className="reading-divider" />

          {/* ✅ Rating section (hidden for first chapter) */}
          {!current?.node.isStart && (
            <section className="reading-section rating-box rating-glow">
              <div className="rating-header">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Leave your mark</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Required before choosing the next genre.
                  </div>
                </div>

                {ratingSubmitted ? (
                  <span className="rating-stamp">
                    ✓ Rated
                    {coinsAwardedLast ? (
                      <span>
                        • <b>+{coinsAwardedLast}</b> coins
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="story-chip">RATE 1–5</span>
                )}
              </div>

              <div className="rating-scale">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`rating-pill ${rating === n ? "rating-pill-selected" : ""}`}
                    onClick={() => setRating(n)}
                    type="button"
                    aria-pressed={rating === n}
                  >
                    {n}
                  </button>
                ))}

                <button
                  className="rating-submit"
                  onClick={submitRating}
                  disabled={ratingSubmitted}
                  type="button"
                >
                  {ratingSubmitted ? "Submitted" : "Submit Rating"}
                </button>
              </div>

              {!ratingSubmitted && (
                <div className="rating-helper">
                  Note: Rating is required before you can continue.
                </div>
              )}
            </section>
          )}


          <div className="reading-divider" />

          <section className="reading-section">
            {current?.node.stepNo === 5 ? (
              <div className="rating-box">
                <h2 className="text-lg font-bold text-slate-900">Final Chapter</h2>
                <p className="mt-1 text-slate-600">Rate this chapter and finish your journey.</p>

                <button className="mt-5 btn-wax" onClick={finishJourney} disabled={finishing} type="button">
                  {finishing ? "Finishing…" : "Finish Journey"}
                </button>
              </div>
            ) : (
              <div className="reading-section">
                <div>
                  <div className="genre-section-title">Choose the path of the story</div>
                  <div className="genre-section-sub">This decision will permanently shape your journey.</div>
                </div>

                <div className="genre-grid">
                  {(current?.choices ?? []).map((c) => (
                    <button key={c.genreKey} className="genre-card text-left" onClick={() => chooseGenre(c.genreKey)} type="button">
                      <div className="genre-name">{c.genreKey}</div>
                      <div className="genre-rating">
                        Avg reader rating: <b>{c.avgRating ?? "—"}</b>
                      </div>
                      <div className="genre-arrow">→</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </article>
      </div>
    </main>
  );
}
