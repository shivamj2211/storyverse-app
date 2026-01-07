"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, authHeaders } from "../lib/api";

export default function VerifyEmailClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = sp.get("token"); // if your URL uses ?token=...
  const [loading, setLoading] = useState(true);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrMsg("");
        setOkMsg("");

        if (!token) {
          setErrMsg("Missing verification token.");
          setLoading(false);
          return;
        }

        const res = await fetch(
          api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
          { method: "GET", headers: { ...authHeaders() } }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrMsg(data?.error || "Email verification failed.");
          setLoading(false);
          return;
        }

        setOkMsg("✅ Email verified successfully. Redirecting...");
        setLoading(false);

        setTimeout(() => {
          router.push("/login");
        }, 1200);
      } catch (e: any) {
        setErrMsg(e?.message || "Something went wrong.");
        setLoading(false);
      }
    })();
  }, [token, router]);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Verify Email</h1>

      {loading ? <p className="mt-3">Verifying...</p> : null}
      {okMsg ? <p className="mt-3">{okMsg}</p> : null}
      {errMsg ? <p className="mt-3 text-red-600">{errMsg}</p> : null}

      {!loading && errMsg ? (
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-md border px-4 py-2"
        >
          Go to Login
        </button>
      ) : null}
    </div>
  );
}
