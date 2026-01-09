"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    // Always scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
