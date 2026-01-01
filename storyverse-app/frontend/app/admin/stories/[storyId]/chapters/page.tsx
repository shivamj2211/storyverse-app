"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "../../../../../components/admin/AdminShell";
import { adminDelete, adminGet, adminPost, adminPut } from "../../../../lib/admin";

type Chapter = {
  id: string;
  story_id: string;
  chapter_number: number;
  content: string;
  created_at?: string;
};

export default function AdminStoryChaptersPage() {
  const params = useParams<{ storyId: string }>();
  const storyId = params?.storyId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);

  // form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [content, setContent] = useState("");

  const sorted = useMemo(() => {
    return [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  }, [chapters]);

  async function load() {
    if (!storyId) return;
    try {
      setError(null);
      setLoading(true);

      // Backend route we will implement: GET /admin/stories/:id/chapters
      const data = await adminGet<{ chapters: Chapter[] }>(
        `/admin/stories/${storyId}/chapters`
      );

      setChapters(data?.chapters || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load chapters");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  function resetForm() {
    setEditingId(null);
    setChapterNumber(1);
    setContent("");
  }

  function startEdit(ch: Chapter) {
    setEditingId(ch.id);
    setChapterNumber(ch.chapter_number);
    setContent(ch.content || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!storyId) return;

    if (!chapterNumber || chapterNumber < 1) {
      alert("Chapter number must be >= 1");
      return;
    }
    if (!content.trim()) {
      alert("Content is required");
      return;
    }

    try {
      setError(null);

      if (editingId) {
        // PUT /admin/chapters/:id
        await adminPut(`/admin/chapters/${editingId}`, {
          chapter_number: chapterNumber,
          content,
        });
      } else {
        // POST /admin/chapters
        await adminPost(`/admin/chapters`, {
          story_id: storyId,
          chapter_number: chapterNumber,
          content,
        });
      }

      resetForm();
      await load();
    } catch (e: any) {
      alert(e?.message || "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this chapter?")) return;
    try {
      await adminDelete(`/admin/chapters/${id}`);
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  return (
    <AdminShell title="Chapters">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Story ID</div>
          <div className="font-mono text-xs">{storyId}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/stories/${storyId}`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Back to Story
          </Link>
          <button
            onClick={() => router.push("/admin/stories")}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            All Stories
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Left: form */}
        <div className="border rounded-2xl p-4 h-fit">
          <div className="text-sm font-semibold">
            {editingId ? "Edit Chapter" : "Add Chapter"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Use unique chapter numbers per story.
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-600">Chapter Number</label>
              <input
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value))}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="Write chapter content here..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Right: list */}
        <div className="border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Chapters</div>
            <button
              onClick={load}
              className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-600 border border-red-200 bg-red-50 p-3 rounded-xl">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-4 text-sm text-gray-500">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="mt-4 text-sm text-gray-500">
              No chapters yet. Add the first one.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sorted.map((ch) => (
                <div
                  key={ch.id}
                  className="border rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      Chapter {ch.chapter_number}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((ch.content || "").trim().split(/\s+/).filter(Boolean).length).toLocaleString()}{" "}
                      words
                    </div>
                    <div className="text-xs text-gray-600 mt-2 line-clamp-3">
                      {(ch.content || "").slice(0, 220)}
                      {(ch.content || "").length > 220 ? "..." : ""}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(ch)}
                      className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(ch.id)}
                      className="px-3 py-2 rounded-xl border text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
