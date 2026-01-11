// backend/src/lib/geo.ts
import type { Request } from "express";

export function getCountryFromRequest(req: Request): string {
  const h = req.headers;

  // Cloudflare
  const cf = (h["cf-ipcountry"] as string) || "";

  // Vercel
  const vercel = (h["x-vercel-ip-country"] as string) || "";

  // Some proxies
  const xCountry = (h["x-country"] as string) || "";

  const country = (cf || vercel || xCountry || "").toUpperCase().trim();
  return country || "IN"; // dev fallback IN
}
