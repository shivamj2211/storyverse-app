"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../lib/api";

export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";

  const [msg, setMsg] = useState("Verifying...");

  useEffect(() => {
    if (!token) {
      setMsg("Missing verification token.");
      return;
    }

    (async () => {
      const res = await fetch(api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`));
      const d = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(d?.error || "Verification failed.");
        return;
      }

      setMsg(d?.status === "already_verified" ? "Already verified ✅" : "Email verified ✅");

      setTimeout(() => router.push("/login"), 1200);
    })();
  }, [token, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold">Email Verification</h1>
        <p className="mt-2 text-sm text-gray-700">{msg}</p>
      </div>
    </div>
  );
}
