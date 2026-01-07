"use client";

import Link from "next/link";

export default function GuidelinesPage() {
  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Community
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              Community <span className="parchment-accent">Guidelines</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              Keep StoryVerse safe, respectful, and enjoyable for everyone.
            </p>
          </div>

          <Link
            href="/"
            className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
          >
            Back Home
          </Link>
        </div>

        {/* Content */}
        <section className="parchment-card">
          <div className="space-y-4 text-sm text-slate-700/80 leading-relaxed">
            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
              <div className="font-extrabold text-slate-900">Be respectful</div>
              <p className="mt-1">
                No harassment, hate speech, threats, or bullying.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
              <div className="font-extrabold text-slate-900">No spam</div>
              <p className="mt-1">
                Avoid repeated promotions, scams, or misleading activity.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
              <div className="font-extrabold text-slate-900">Respect creators</div>
              <p className="mt-1">
                Don’t copy or repost content without permission.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
              <div className="font-extrabold text-slate-900">Report issues</div>
              <p className="mt-1">
                If you see something wrong, use the Contact page to report it.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="story-btn story-btn-primary px-5 inline-flex items-center justify-center"
              >
                Contact Support
              </Link>
              <Link
                href="/stories"
                className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
              >
                Browse Stories
              </Link>
            </div>
          </div>

          <div className="mt-6 parchment-note text-center">
            Our goal: a calm, safe place to read and create.
          </div>
        </section>
      </div>
    </main>
  );
}
