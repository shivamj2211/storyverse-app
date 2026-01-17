import type { MetadataRoute } from "next";

const BASE_URL = "https://storyverrse.asumatech.com"; // ✅ apna domain
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function getAllStories() {
  // ✅ backend already has: GET /api/stories  (public list)
  // Limit 100 per call. Agar 100+ stories ho to pagination add kar denge.
  const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/stories?limit=100&offset=0`, {
    // sitemap build time pe fresh data
    cache: "no-store",
  });

  if (!res.ok) return [];
  const data = await res.json().catch(() => null);

  return Array.isArray(data?.stories) ? data.stories : [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await getAllStories();

  const fixed: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date() },
    { url: `${BASE_URL}/explore`, lastModified: new Date() },
    { url: `${BASE_URL}/stories`, lastModified: new Date() },
  ];

  const storyUrls: MetadataRoute.Sitemap = stories.map((s: any) => ({
    // ✅ tumhara route: /stories/[id] (abhi id use ho raha)
    url: `${BASE_URL}/stories/${s.id}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
  }));

  return [...fixed, ...storyUrls];
}
