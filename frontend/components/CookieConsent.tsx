"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) setShow(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);
    location.reload();
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          We use cookies to improve your experience, analyze traffic, and personalize content.
          Read our{" "}
          <a href="/cookie-policy" className="underline text-emerald-600">
            Cookie Policy
          </a>.
        </p>

        <div className="flex gap-2">
          <button
            onClick={rejectCookies}
            className="px-4 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700"
          >
            Reject
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
