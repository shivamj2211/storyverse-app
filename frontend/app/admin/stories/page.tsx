"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../../../components/admin/AdminShell";
import { api, authHeaders } from "../../../app/lib/api";

interface AdminStory {
  id: string;
  slug: string;
  title: string;
  versions?: { id: string; versionName: string; isPublished: boolean }[];
}

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(api("/api/admin/stories"), {
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch admin stories");
        }

        const list = data?.stories || data;
        if (!cancelled) setStories(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Unable to fetch admin stories");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell title="Stories">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="!text-xl font-semibold">Stories</h2>
          <p className="!text-sm !text-gray-600 mt-1">
            Manage stories and their versions.
          </p>
        </div>

        <Link
          href="/admin/stories/upload"
          className="px-4 py-2 rounded-xl bg-gray-900 !text-white !text-sm hover:bg-gray-800 transition"
        >
          Upload Package
        </Link>
      </div>

      {loading ? (
        <div className="!text-sm !text-gray-600">Loading...</div>
      ) : error ? (
        <div className="!text-sm !text-red-600">{error}</div>
      ) : stories.length === 0 ? (
        <div className="!text-sm !text-gray-600">No stories found.</div>
      ) : (
        <div className="divide-y border rounded-2xl overflow-hidden">
          {stories.map((story) => (
            <div key={story.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{story.title}</div>
                  <div className="!text-xs !text-gray-500 mt-1">
                    Slug: {story.slug}
                  </div>
                </div>

                <Link
                  href={`/admin/stories/${story.id}`}
                  className="!text-sm !text-gray-900 underline hover:!text-gray-700"
                >
                  Manage Versions
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
