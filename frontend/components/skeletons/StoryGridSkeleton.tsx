"use client";

import React from "react";

export function StoryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative h-36 sm:h-44 bg-slate-100 dark:bg-zinc-800 animate-pulse" />
      <div className="p-4">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        <div className="mt-2 h-3 w-full rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        <div className="mt-2 h-3 w-5/6 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />

        <div className="mt-4 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-6 w-14 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
        </div>

        <div className="mt-4 h-9 w-28 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}

export function StoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <StoryCardSkeleton key={i} />
      ))}
    </div>
  );
}
