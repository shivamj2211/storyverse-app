"use client";

import React from "react";
import Link from "next/link";

type Step = {
  title: string;
  desc: string;
  icon: React.ReactNode;
};

export default function HowItWorks() {
  const steps: Step[] = [
    {
      title: "Discover Stories",
      desc: "Browse immersive stories across genres — fantasy, drama, mystery, and more.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6a2 2 0 0 1 2-2h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M6 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Start a Journey",
      desc: "Each story is a journey with steps and paths — not endless scrolling.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      ),
    },
    {
      title: "Make Choices",
      desc: "At key moments, you decide what happens next. Your choices shape the story.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 3v6a3 3 0 0 0 3 3h9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18 21v-6a3 3 0 0 0-3-3H6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M15 6l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 18l-3 3-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Unlock & Continue",
      desc: "Earn coins by reading, rating, and completing stories. Use coins to unlock deeper paths.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2c4.4 0 8 2.2 8 5s-3.6 5-8 5-8-2.2-8-5 3.6-5 8-5Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M4 7v5c0 2.8 3.6 5 8 5s8-2.2 8-5V7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M7 20.5c1.4 1 3.2 1.5 5 1.5s3.6-.5 5-1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: "Finish or Replay",
      desc: "Complete journeys, rate them, or replay to explore alternate endings.",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12a9 9 0 1 1-3-6.7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M9.5 12.5 11 14l3.5-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 mt-10 sm:mt-14">
      <div className="rounded-3xl border border-slate-200 bg-white/70 dark:bg-zinc-900/60 dark:border-zinc-700 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-[0.22em] uppercase text-slate-600/80 dark:text-zinc-300/70">
              How it works
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
              Read. Choose. Continue.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-700/80 dark:text-zinc-200/75 max-w-2xl">
              Storyverse is interactive storytelling. Your progress is saved, your choices shape outcomes,
              and every replay can reveal a new path.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/stories"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 transition"
            >
              Explore Stories
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-extrabold transition bg-white text-slate-900 border-slate-200 hover:bg-slate-50 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-300 dark:hover:bg-zinc-200"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl border border-slate-200 bg-white/70 dark:bg-zinc-950/40 dark:border-zinc-700 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/25 flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                    {s.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-700/80 dark:text-zinc-200/75">
                    {s.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-white/80 to-white/40 dark:from-zinc-950/40 dark:to-zinc-950/20 dark:border-zinc-700 p-5">
          <div className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
            No pressure. No rush.
          </div>
          <div className="mt-1 text-sm text-slate-700/80 dark:text-zinc-200/75">
            Read at your pace — your progress is always saved. Replay anytime to explore alternate paths.
          </div>
        </div>
      </div>
    </section>
  );
}
