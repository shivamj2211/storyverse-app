"use client";

import Link from "next/link";

export default function TermsPage() {
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
              Terms <span className="parchment-accent">&amp; Conditions</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              By using StoryVerse, you agree to these basic rules.
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
                1. Use responsibly
              </div>
              <p className="mt-2">
                Don’t misuse the platform, attempt unauthorized access, or disrupt
                services.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                2. Accounts
              </div>
              <p className="mt-2">
                You are responsible for activities under your account. Keep your
                login secure.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                3. Coins & features
              </div>
              <p className="mt-2">
                Coins, premium features, and rewards may change as we improve the
                product. Abuse or manipulation can lead to restrictions.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                4. Content
              </div>
              <p className="mt-2">
                Respect creators. Do not copy, scrape, or re-upload content without
                permission.
              </p>
            </div>

            <div>
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                5. Contact
              </div>
              <p className="mt-2">
                If you have questions, contact{" "}
                <a className="underline hover:text-slate-900" href="mailto:support@storyverse.in">
                  support@storyverse.in
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-6 parchment-note text-center">
            These terms are a starter. We’ll update them before full monetization.
          </div>
        </section>
      </div>
    </main>
  );
}
