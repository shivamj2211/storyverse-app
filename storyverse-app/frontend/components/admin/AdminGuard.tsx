"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "../../app/lib/api"; // ✅ preferred

type MeResponse =
  | { user: { is_admin: boolean } & Record<string, any> }
  | ({ is_admin: boolean } & Record<string, any>);

function extractUser(me: any) {
  return me?.user ? me.user : me;
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      console.log("🔐 AdminGuard: Checking admin access for pathname:", pathname);
      try {
        const token = getToken();

        if (!token) {
          console.log("❌ AdminGuard: No token found, redirecting to login");
          router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
          return;
        }

        const res = await fetch(api("/api/auth/me"), {
          method: "GET",
          headers: {
            ...authHeaders(),
          },
        });

        let data: MeResponse | null = null;
        try {
          data = (await res.json()) as MeResponse;
        } catch {
          data = null;
        }

        const user = extractUser(data);
        console.log("👤 AdminGuard: User data:", { is_admin: user?.is_admin, email: user?.email });

        if (!res.ok || !user?.is_admin) {
          console.log("❌ AdminGuard: User is not admin, redirecting to home");
          router.replace("/");
          return;
        }

        console.log("✅ AdminGuard: User is admin, allowing access");
        if (!cancelled) setAllowed(true);
      } catch (err) {
        console.error("❌ AdminGuard: Error:", err);
        router.replace("/");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking admin access...</div>
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}
