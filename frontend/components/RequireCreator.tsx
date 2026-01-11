"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "../app/lib/api";

type MeUser = {
  id: string;
  plan?: "free" | "premium" | "creator";
  is_email_verified?: boolean;
};

export default function RequireCreator({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState<"loading" | "allowed" | "blocked">("loading");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?reason=need_login&next=${encodeURIComponent(pathname)}`);
      return;
    }

    (async () => {
      try {
        const res = await fetch(api("/api/auth/me"), {
          headers: { ...authHeaders() },
          cache: "no-store",
        });

        if (res.status === 401) {
          router.replace(`/login?reason=session_expired&next=${encodeURIComponent(pathname)}`);
          return;
        }

        const data = await res.json().catch(() => ({}));
        const user: MeUser | null = data?.user || null;

        if (!user) {
          router.replace(`/login?reason=need_login&next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (!user.is_email_verified) {
          router.replace(`/profile?reason=email_not_verified&next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (user.plan !== "creator") {
          router.replace(`/premium?reason=creator_required&next=${encodeURIComponent(pathname)}`);
          return;
        }

        setOk("allowed");
      } catch {
        router.replace(`/login?reason=session_expired&next=${encodeURIComponent(pathname)}`);
      }
    })();
  }, [router, pathname]);

  if (ok === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border p-6">
          <div className="text-lg font-semibold">Checking access…</div>
          <div className="mt-2 text-sm text-slate-600">Please wait.</div>
        </div>
      </div>
    );
  }

  if (ok !== "allowed") return null;
  return <>{children}</>;
}
