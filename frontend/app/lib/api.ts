
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";


export function api(path: string) {
  const base = (API_URL || BASE).replace(/\/$/, ""); // ✅ fallback to localhost:4000
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
  const token = typeof window !== "undefined" ? getToken() : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}



export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const res = await fetch(input, init);

  // ✅ Auto logout on token invalid / session expired
  if (res.status === 401) {
    try {
      const data = await res.clone().json().catch(() => ({}));
      const msg = String((data as any)?.error || "");

      // If token expired or invalid, clear it
      if (msg.toLowerCase().includes("session expired") || msg.toLowerCase().includes("invalid token") || msg.toLowerCase().includes("unauthorized")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          window.dispatchEvent(new Event("authChanged"));
        }
      }
    } catch {
      // ignore
    }
  }

  return res;
}
