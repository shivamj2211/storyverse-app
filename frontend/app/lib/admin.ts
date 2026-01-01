import { api, authHeaders, getToken } from "./api";

async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(api(path), {
    method,
    headers: {
      "Content-Type": body ? "application/json" : undefined,
      ...authHeaders(),
    } as Record<string, string>,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export function adminGet<T = any>(path: string) {
  return request<T>("GET", path);
}
export function adminPost<T = any>(path: string, body: any) {
  return request<T>("POST", path, body);
}
export function adminPut<T = any>(path: string, body: any) {
  return request<T>("PUT", path, body);
}
export function adminPatch<T = any>(path: string, body: any) {
  return request<T>("PATCH", path, body);
}
export function adminDelete<T = any>(path: string) {
  return request<T>("DELETE", path);
}
