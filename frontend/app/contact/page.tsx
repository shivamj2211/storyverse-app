"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const email = "support@storyverse.in";

  return (
    <main className="parchment-page">
      <div className="parchment-shell">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
              Support
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
              Contact <span className="parchment-accent">Us</span>
            </h1>
            <p className="mt-2 text-sm text-slate-700/80">
              Facing an issue, feedback, or want to report something? Reach us here.
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
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-4">
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                Email
              </div>
              <div className="mt-2 text-lg font-extrabold text-slate-900">
                {email}
              </div>
              <p className="mt-2 text-sm text-slate-700/80">
                We usually respond within 24–48 hours (working days).
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={`mailto:${email}`}
                  className="story-btn story-btn-primary px-5 inline-flex items-center justify-center"
                >
                  Email Support
                </a>

                <button
                  className="story-btn story-btn-ghost px-5"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(email);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  {copied ? "Copied!" : "Copy Email"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-4">
              <div className="text-xs font-bold tracking-[0.22em] uppercase text-slate-700/70">
                Tips for faster help
              </div>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700/80 space-y-1">
                <li>Tell us your email / username.</li>
                <li>Share the story name and chapter if related.</li>
                <li>Attach a screenshot if possible.</li>
              </ul>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/privacy"
                  className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="story-btn story-btn-ghost px-5 inline-flex items-center justify-center"
                >
                  Terms
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 parchment-note text-center">
            Thanks for helping us improve StoryVerse.
          </div>
        </section>
      </div>
    </main>
  );
}
