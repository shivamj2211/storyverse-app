"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Storyverse
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              About <span className="parchment-accent">Us</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              Interactive stories where your choices decide what happens next.
            </p>
          </div>

          <Link
            href="/stories"
            className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
          >
            Browse Stories
          </Link>
        </div>

        <section className="parchment-card">
          <div className="space-y-5 text-sm text-slate-700/80 leading-relaxed">
            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                What Storyverse is
              </div>
              <p className="mt-2">
                Storyverse is a choice-based reading experience. You read a chapter,
                make a choice, and the story continues based on your selection.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                How it works (simple)
              </div>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Pick a story and start reading.</li>
                <li>At the end of a chapter, choose what to do next.</li>
                <li>Your progress is saved in your account.</li>
                <li>Coins & rewards help unlock chapters (for free users).</li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                Our focus
              </div>
              <p className="mt-2">
                Clean reading UI, fast loading, fair unlocking system, and a safe account
                system (email verification, password security).
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                Contact
              </div>
              <p className="mt-2">
                Need help? Email{" "}
                <a className="underline hover:text-slate-900" href="mailto:support@storyverse.in">
                  support@storyverse.in
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
