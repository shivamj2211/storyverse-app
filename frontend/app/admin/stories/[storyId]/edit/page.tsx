"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../../../../components/admin/AdminShell";
import { api, authHeaders, getToken } from "../../../../lib/api";

type AdminStoryDetail = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  coverImageUrl?: string | null;
  // tolerate snake_case if backend returns it
  cover_image_url?: string | null;
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default function AdminEditStoryPage() {
  const params = useParams<{ storyId: string }>();
  const storyId = (params?.storyId || "") as string;

  const router = useRouter();
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [story, setStory] = useState<AdminStoryDetail | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const normalizedCover = useMemo(() => {
    const v = coverImageUrl.trim();
    if (!v) return "";
    return v;
  }, [coverImageUrl]);

  async function fetchStory() {
    if (!token) return;

    setLoading(true);
    setError("");
    setOk("");

    try {
      let res = await fetch(api(`/api/admin/stories/${encodeURIComponent(storyId)}`), {
        method: "GET",
        headers: { ...authHeaders() },
        cache: "no-store",
      });

      // In case some deployment only supports query string
      if (res.status === 404) {
        res = await fetch(api(`/api/admin/stories?id=${encodeURIComponent(storyId)}`), {
          method: "GET",
          headers: { ...authHeaders() },
          cache: "no-store",
        });
      }

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to load story");
      }

      const s: AdminStoryDetail = data?.story || data;
      setStory(s);

      setTitle(String(s?.title || ""));
      setSlug(String(s?.slug || ""));
      setSummary(String(s?.summary || ""));

      const c = (s?.coverImageUrl ?? s?.cover_image_url ?? "") as string;
      setCoverImageUrl(String(c || ""));
    } catch (e: any) {
      setError(e?.message || "Unable to load story");
      setStory(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, token]);

  async function save() {
    if (!token) return;

    setSaving(true);
    setError("");
    setOk("");

    try {
      const payload: any = {
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim(),
      };

      const cover = normalizedCover;
      if (cover) {
        if (!isValidUrl(cover)) {
          setSaving(false);
          setError("Cover image must be a valid URL (https://...)");
          return;
        }
        payload.coverImageUrl = cover;
      } else {
        payload.coverImageUrl = null;
      }

      let res = await fetch(api(`/api/admin/stories/${encodeURIComponent(storyId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      // fallback: some older servers might only support PUT
      if (res.status === 404 || res.status === 405) {
        res = await fetch(api(`/api/admin/stories/${encodeURIComponent(storyId)}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to save story");
      }

      setOk("Saved successfully");
      await fetchStory();
    } catch (e: any) {
      setError(e?.message || "Unable to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <AdminShell title="Edit Story">
        <div className="text-sm text-gray-700">Please log in as admin to edit this story.</div>
      </AdminShell>
    );
  }

  if (loading) {
    return (
      <AdminShell title="Edit Story">
        <div className="text-sm text-gray-500">Loading...</div>
      </AdminShell>
    );
  }

  if (error && !story) {
    return (
      <AdminShell title="Edit Story">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
        <div className="mt-3">
          <Link href={`/admin/stories/${storyId}`} className="text-sm underline">
            ← Back to Story
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Edit Story">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-gray-500">Editing</div>
          <div className="text-lg font-semibold">{story?.title || "Story"}</div>
          <div className="text-xs text-gray-500 mt-1 font-mono">{storyId}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/stories/${storyId}`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            ← Back
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              saving ? "bg-gray-300 text-gray-700" : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {ok}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="border rounded-2xl p-4 bg-white">
          <div className="text-sm font-semibold mb-3">Story Details</div>

          <label className="block text-xs text-gray-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
            placeholder="Story title"
          />

          <label className="block text-xs text-gray-500 mt-4">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm font-mono"
            placeholder="story-slug"
          />
          <div className="text-xs text-gray-500 mt-1">Used in URLs. Keep it unique.</div>

          <label className="block text-xs text-gray-500 mt-4">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm min-h-[120px]"
            placeholder="Short description shown on Explore / Stories page"
          />

          <label className="block text-xs text-gray-500 mt-4">Cover Image URL</label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
            placeholder="https://..."
          />
          <div className="text-xs text-gray-500 mt-1">Leave empty to remove cover image.</div>
        </div>

        <div className="border rounded-2xl p-4 bg-white">
          <div className="text-sm font-semibold mb-3">Preview</div>

          <div className="rounded-2xl overflow-hidden border bg-gray-50">
            <div className="p-4">
              <div className="text-sm font-semibold">{title.trim() || "(No title)"}</div>
              <div className="text-xs text-gray-500 mt-1 font-mono">{slug.trim() || "(No slug)"}</div>
              {summary.trim() ? <div className="text-sm text-gray-700 mt-3">{summary.trim()}</div> : null}
            </div>

            {normalizedCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={normalizedCover} alt="Cover" className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 flex items-center justify-center text-xs text-gray-500">
                No cover image
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Tip: Use a CDN/hosted image link. Avoid temporary URLs.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
