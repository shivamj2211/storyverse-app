"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../../../components/admin/AdminShell";
import { api, authHeaders, getToken } from "../../../lib/api";

type VersionInfo = {
  id: string;
  versionName: string;
  isPublished: boolean;
  publishedAt: string | null;
  notes: string | null;
};

type AdminStoryDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  versions: VersionInfo[];
};

export default function AdminStoryDetailPage() {
  const params = useParams<{ storyId: string }>();
  const storyId = params?.storyId as string;

  const router = useRouter();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [story, setStory] = useState<AdminStoryDetail | null>(null);

  const publishedVersion = useMemo(() => {
    return story?.versions?.find((v) => v.isPublished) || null;
  }, [story]);

  async function fetchStory() {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(api(`/api/admin/stories/${storyId}`), {
        method: "GET",
        headers: { ...authHeaders() },
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Failed to fetch story");
        setStory(null);
        return;
      }

      setStory(data);
    } catch (e: any) {
      setError(e?.message || "Unable to fetch story");
      setStory(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, token]);

  async function handlePublish(versionId: string) {
    if (!token) return;

    try {
      const res = await fetch(api(`/api/admin/versions/${versionId}/publish`), {
        method: "POST",
        headers: { ...authHeaders() },
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Unable to publish");
        return;
      }
      await fetchStory();
    } catch {
      alert("Unexpected error publishing");
    }
  }

  async function handleUnpublish(versionId: string) {
    if (!token) return;

    try {
      const res = await fetch(api(`/api/admin/versions/${versionId}/unpublish`), {
        method: "POST",
        headers: { ...authHeaders() },
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Unable to unpublish");
        return;
      }
      await fetchStory();
    } catch {
      alert("Unexpected error unpublishing");
    }
  }

  if (!token) {
    return (
      <AdminShell title="Story Details">
        <div className="text-sm text-gray-700">
          Please log in as admin to view story details.
        </div>
      </AdminShell>
    );
  }

  if (loading) {
    return (
      <AdminShell title="Story Details">
        <div className="text-sm text-gray-500">Loading...</div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Story Details">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      </AdminShell>
    );
  }

  if (!story) {
    return (
      <AdminShell title="Story Details">
        <div className="text-sm text-gray-600">Story not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Story Details">
      {/* Top actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-500">Title</div>
          <div className="text-xl font-semibold truncate">{story.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            Slug: <span className="font-mono">{story.slug}</span> • Story ID:{" "}
            <span className="font-mono">{story.id}</span>
          </div>

          {story.summary ? (
            <div className="mt-3 text-sm text-gray-700">{story.summary}</div>
          ) : null}

          {publishedVersion ? (
            <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-green-100 text-green-800">
              Published: {publishedVersion.versionName}
              {publishedVersion.publishedAt ? (
                <span className="text-green-700">
                  • {new Date(publishedVersion.publishedAt).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
              Not Published
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/stories"
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            ← All Stories
          </Link>

          <Link
            href={`/admin/stories/${storyId}/edit`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Edit Story
          </Link>

          <Link
            href={`/admin/stories/${storyId}/nodes`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Manage Nodes
          </Link>

          <Link
            href={`/admin/stories/${storyId}/choices`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Manage Choices
          </Link>

                    <Link
            href={`/admin/stories/upload?storyId=${encodeURIComponent(storyId)}`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Import JSON
          </Link>

        </div>
      </div>

      {/* Versions */}
      <div className="mt-8 border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Versions</div>
          <button
            onClick={fetchStory}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {story.versions?.length ? (
          <div className="mt-4 space-y-2">
            {story.versions.map((v) => (
              <div
                key={v.id}
                className="border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {v.versionName}{" "}
                    {v.isPublished ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Published
                      </span>
                    ) : (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        Draft
                      </span>
                    )}
                  </div>

                  {v.notes ? (
                    <div className="text-xs text-gray-600 mt-1">{v.notes}</div>
                  ) : null}

                  {v.isPublished && v.publishedAt ? (
                    <div className="text-xs text-gray-500 mt-1">
                      Published on {new Date(v.publishedAt).toLocaleString()}
                    </div>
                  ) : null}

                  <div className="text-xs text-gray-500 mt-1">
                    Version ID: <span className="font-mono">{v.id}</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {!v.isPublished ? (
                    <button
                      onClick={() => handlePublish(v.id)}
                      className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm"
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnpublish(v.id)}
                      className="px-3 py-2 rounded-xl border text-sm text-red-600 hover:bg-red-50"
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500">
            No versions found yet. (JSON import usually creates a version.)
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          Workflow: Import JSON → Creates Draft Version → Add/Update Nodes & Choices → Publish.
        </div>
      </div>

      {/* Helpful next step */}
      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => router.push(`/admin/stories/${storyId}/nodes`)}
          className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50"
        >
          Next: Build Nodes (Step 1–5)
        </button>

        <button
          onClick={() => router.push(`/admin/stories/${storyId}/choices`)}
          className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50"
        >
          Then: Add Choices (Branching)
        </button>
      </div>
    </AdminShell>
  );
}
