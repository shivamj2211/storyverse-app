export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";


export function api(path: string) {
  const base = (API_URL || "").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getToken() {
  if (typeof window === "undefined") return "";

  // support older + newer keys (safe)
  const t =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    "";

  return t;
}



export function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
