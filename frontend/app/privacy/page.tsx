"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Legal
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              Privacy <span className="parchment-accent">Policy</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              We respect your privacy. This page explains what we collect and why.
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
          <div className="space-y-5 text-sm text-slate-700/80 leading-relaxed">
            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                1. Information we collect
              </div>
              <p className="mt-2">
                We may collect basic account details (like email, name) and usage
                data (like pages visited) to run the platform and improve reading
                experience.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                2. How we use information
              </div>
              <p className="mt-2">
                We use it to authenticate users, personalize content, keep the
                platform secure, and improve features.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                3. Data sharing
              </div>
              <p className="mt-2">
                We do not sell personal data. We may share limited data only when
                required for essential services (like hosting) or legal compliance.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                4. Contact
              </div>
              <p className="mt-2">
                Questions about privacy? Email us at{" "}
                <a className="underline hover:text-slate-900" href="mailto:support@storyverse.in">
                  support@storyverse.in
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-6 parchment-note text-center">
            This is a starter policy page — we’ll expand it as features grow.
          </div>
        </section>
      </div>
    </main>
  );
}
