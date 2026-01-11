"use client";

import Link from "next/link";

export default function PremiumSuccessPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold text-emerald-700">
        🎉 Payment Successful
      </h1>
      <p className="mt-4 text-slate-600">
        Your plan is being activated. This may take a few seconds.
      </p>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/stories" className="btn-primary">
          Go to Stories
        </Link>
        <Link href="/profile" className="btn-ghost">
          View Profile
        </Link>
      </div>
    </main>
  );
}
