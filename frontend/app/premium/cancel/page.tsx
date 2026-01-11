"use client";

import Link from "next/link";

export default function PremiumCancelPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold text-amber-600">
        Payment Cancelled
      </h1>
      <p className="mt-4 text-slate-600">
        You cancelled the payment. No charges were made.
      </p>

      <div className="mt-8">
        <Link href="/premium" className="btn-primary">
          Try Again
        </Link>
      </div>
    </main>
  );
}
