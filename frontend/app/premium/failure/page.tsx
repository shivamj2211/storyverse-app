"use client";

import Link from "next/link";

export default function PremiumFailurePage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold text-red-600">
        ❌ Payment Failed
      </h1>
      <p className="mt-4 text-slate-600">
        Something went wrong during payment. Please try again.
      </p>

      <div className="mt-8 flex justify-center gap-4">
        <Link href="/premium" className="btn-primary">
          Retry Payment
        </Link>
        <Link href="/support" className="btn-ghost">
          Contact Support
        </Link>
      </div>
    </main>
  );
}
