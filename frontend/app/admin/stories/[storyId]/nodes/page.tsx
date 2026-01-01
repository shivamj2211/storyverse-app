"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminShell from "../../../../../components/admin/AdminShell";
import { api, authHeaders, getToken } from "../../../../lib/api";

type NodeRow = {
  id: string;
  story_version_id: string;
  step_no: number;
  node_code: string;
  title: string;
  content: string;
  is_start: boolean;
  created_at?: string;
};

function wordCount(s: string) {
  const parts = (s || "").trim().split(/\s+/).filter(Boolean);
  return parts.length;
}

export default function AdminStoryNodesPage() {
  const params = useParams<{ storyId: string }>();
  const storyId = params?.storyId as string;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [versionId, setVersionId] = useState<string>("");
  const [nodes, setNodes] = useState<NodeRow[]>([]);

  // form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stepNo, setStepNo] = useState<number>(1);
  const [nodeCode, setNodeCode] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isStart, setIsStart] = useState<boolean>(false);

  const sorted = useMemo(() => {
    return [...nodes].sort((a, b) => {
      if (a.step_no !== b.step_no) return a.step_no - b.step_no;
      return (a.node_code || "").localeCompare(b.node_code || "");
    });
  }, [nodes]);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const token = getToken();
      if (!token) throw new Error("Not logged in");

      const res = await fetch(api(`/api/admin/stories/${storyId}/nodes`), {
        method: "GET",
        headers: { ...authHeaders() },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load nodes");
      }

      setVersionId(data?.versionId || "");
      setNodes(data?.nodes || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load nodes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  function resetForm() {
    setEditingId(null);
    setStepNo(1);
    setNodeCode("");
    setTitle("");
    setContent("");
    setIsStart(false);
  }

  function startEdit(n: NodeRow) {
    setEditingId(n.id);
    setStepNo(n.step_no);
    setNodeCode(n.node_code || "");
    setTitle(n.title || "");
    setContent(n.content || "");
    setIsStart(!!n.is_start);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    try {
      setErr("");

      const token = getToken();
      if (!token) throw new Error("Not logged in");

      if (!title.trim()) throw new Error("Title is required");
      if (!content.trim()) throw new Error("Content is required");
      if (stepNo < 1 || stepNo > 5) throw new Error("Step must be between 1 and 5");

      const payload = {
        story_id: storyId,
        story_version_id: versionId || undefined, // prefer current version
        step_no: stepNo,
        node_code: nodeCode.trim() ? nodeCode.trim() : undefined,
        title: title.trim(),
        content: content.trim(),
        is_start: isStart,
      };

      if (editingId) {
        const res = await fetch(api(`/api/admin/nodes/${editingId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            step_no: payload.step_no,
            node_code: payload.node_code,
            title: payload.title,
            content: payload.content,
            is_start: payload.is_start,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update failed");
      } else {
        const res = await fetch(api(`/api/admin/nodes`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create failed");
      }

      resetForm();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this node? (Choices linked to it will also be removed)")) return;

    try {
      setErr("");

      const res = await fetch(api(`/api/admin/nodes/${id}`), {
        method: "DELETE",
        headers: { ...authHeaders() },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      await load();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    }
  }

  return (
    <AdminShell title="Story Nodes (Steps 1–5)">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">Story ID</div>
          <div className="font-mono text-xs">{storyId}</div>
          <div className="text-xs text-gray-500 mt-1">
            Version ID: <span className="font-mono">{versionId || "—"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/stories/${storyId}`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Back to Story
          </Link>
          <Link
            href={`/admin/stories/${storyId}/choices`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            Manage Choices →
          </Link>
                    <Link
            href={`/admin/stories/upload?storyId=${encodeURIComponent(storyId)}`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
            >
            Import JSON
            </Link>

        </div>
      </div>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        {/* Form */}
        <div className="border rounded-2xl p-4 h-fit">
          <div className="text-sm font-semibold">
            {editingId ? "Edit Node" : "Create Node"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Tip: StepNo must be 1–5 (your DB constraint).
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Step No (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={stepNo}
                  onChange={(e) => setStepNo(Number(e.target.value))}
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Node Code (optional)</label>
                <input
                  value={nodeCode}
                  onChange={(e) => setNodeCode(e.target.value)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="e.g. start, A1..."
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="Node title"
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                placeholder="Write node content here..."
              />
              <div className="mt-1 text-xs text-gray-500">
                Words: {wordCount(content).toLocaleString()}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isStart}
                onChange={(e) => setIsStart(e.target.checked)}
              />
              Set as start node
            </label>

            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm"
              >
                {editingId ? "Update" : "Create"}
              </button>

              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50"
              >
                Clear
              </button>

              <button
                onClick={load}
                className="ml-auto px-4 py-2 rounded-xl border text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Nodes ({sorted.length})</div>
            {loading ? (
              <div className="text-xs text-gray-500">Loading...</div>
            ) : null}
          </div>

          {sorted.length === 0 && !loading ? (
            <div className="mt-4 text-sm text-gray-500">
              No nodes yet. Create the first one (Step 1) and mark it as start.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sorted.map((n) => (
                <div key={n.id} className="border rounded-xl p-3 flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">
                        Step {n.step_no} — {n.title}
                      </div>
                      {n.is_start ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          START
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      code: <span className="font-mono">{n.node_code}</span> •{" "}
                      {wordCount(n.content).toLocaleString()} words
                    </div>

                    <div className="mt-2 text-xs text-gray-700 line-clamp-3">
                      {n.content?.slice(0, 240)}
                      {n.content?.length > 240 ? "..." : ""}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => startEdit(n)}
                      className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(n.id)}
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
