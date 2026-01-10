"use client";

import Link from "next/link";

const FAQS = [
  {
    q: "How do I start reading?",
    a: "Go to Stories, open any story, and start Chapter 1. Your journey will be saved automatically once you’re logged in.",
  },
  {
    q: "What are coins used for?",
    a: "Coins help free users unlock gated chapters (example: Chapter 3+). Premium users may bypass coin gates depending on your rules.",
  },
  {
    q: "Why should I verify my email?",
    a: "Email verification secures your account and helps prevent abuse. Some rewards/coins/features can be restricted until verified.",
  },
  {
    q: "I forgot my password. What should I do?",
    a: "Use ‘Forgot password’ on the login page. If the email exists, you’ll receive a temporary password in your inbox/spam.",
  },
  {
    q: "How do I continue from where I left off?",
    a: "Open Library / Runs / Continue Reading. You’ll see your recent journeys and can resume anytime.",
  },
];

export default function FaqPage() {
  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Help
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              Frequently Asked <span className="parchment-accent">Questions</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              Quick answers about reading, coins, and account.
            </p>
          </div>

          <Link
            href="/"
            className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
          >
            Back Home
          </Link>
        </div>

        <section className="parchment-card">
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                <div className="text-sm font-extrabold text-slate-900">{f.q}</div>
                <div className="mt-2 text-sm text-slate-700/80 leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 parchment-note text-center">
            Still stuck? Email{" "}
            <a className="underline hover:text-slate-900" href="mailto:support@storyverse.in">
              support@storyverse.in
            </a>
            .
          </div>
        </section>
      </div>
    </main>
  );
}
