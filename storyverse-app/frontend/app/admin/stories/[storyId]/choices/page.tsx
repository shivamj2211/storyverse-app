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
};

type ChoiceRow = {
  id: string;
  story_version_id: string;
  genre_key: string; // used as label in your DB
  from_node_id: string;
  to_node_id: string;

  // joined preview fields (from backend query)
  from_node_code?: string;
  from_title?: string;
  to_node_code?: string;
  to_title?: string;
};

export default function AdminStoryChoicesPage() {
  const params = useParams<{ storyId: string }>();
  const storyId = params?.storyId as string;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [versionId, setVersionId] = useState<string>("");

  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [choices, setChoices] = useState<ChoiceRow[]>([]);

  // form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromNodeId, setFromNodeId] = useState<string>("");
  const [toNodeId, setToNodeId] = useState<string>("");
  const [label, setLabel] = useState<string>(""); // maps to genre_key column

  const nodesById = useMemo(() => {
    const m = new Map<string, NodeRow>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      if (a.step_no !== b.step_no) return a.step_no - b.step_no;
      return (a.node_code || "").localeCompare(b.node_code || "");
    });
  }, [nodes]);

  const sortedChoices = useMemo(() => {
    return [...choices].sort((a, b) => {
      const fa = nodesById.get(a.from_node_id);
      const fb = nodesById.get(b.from_node_id);
      const sa = fa?.step_no ?? 999;
      const sb = fb?.step_no ?? 999;
      if (sa !== sb) return sa - sb;
      return (a.genre_key || "").localeCompare(b.genre_key || "");
    });
  }, [choices, nodesById]);

  async function loadAll() {
    try {
      setErr("");
      setLoading(true);

      const token = getToken();
      if (!token) throw new Error("Not logged in");

      // 1) Load nodes (need for dropdowns)
      const nres = await fetch(api(`/api/admin/stories/${storyId}/nodes`), {
        method: "GET",
        headers: { ...authHeaders() },
      });
      const ndata = await nres.json();
      if (!nres.ok) throw new Error(ndata?.error || "Failed to load nodes");

      setVersionId(ndata?.versionId || "");
      setNodes(ndata?.nodes || []);

      // 2) Load choices
      const cres = await fetch(api(`/api/admin/stories/${storyId}/choices`), {
        method: "GET",
        headers: { ...authHeaders() },
      });
      const cdata = await cres.json();
      if (!cres.ok) throw new Error(cdata?.error || "Failed to load choices");

      setChoices(cdata?.choices || []);

      // default set from node to start node (if empty)
      const startNode = (ndata?.nodes || []).find((x: NodeRow) => x.is_start);
      if (startNode && !fromNodeId) setFromNodeId(startNode.id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (storyId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  function resetForm() {
    setEditingId(null);
    setLabel("");
    setToNodeId("");
    // keep fromNodeId (so adding many choices from same node is easy)
  }

  function startEdit(ch: ChoiceRow) {
    setEditingId(ch.id);
    setFromNodeId(ch.from_node_id);
    setToNodeId(ch.to_node_id);
    setLabel(ch.genre_key || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    try {
      setErr("");

      const token = getToken();
      if (!token) throw new Error("Not logged in");

      if (!versionId) throw new Error("Missing versionId. Create nodes first.");
      if (!fromNodeId) throw new Error("Select a FROM node");
      if (!toNodeId) throw new Error("Select a TO node");
      if (!label.trim()) throw new Error("Choice label is required");

      if (fromNodeId === toNodeId) {
        throw new Error("FROM and TO cannot be the same node");
      }

      if (editingId) {
        const res = await fetch(api(`/api/admin/choices/${editingId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            genre_key: label.trim(),
            to_node_id: toNodeId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update failed");
      } else {
        const res = await fetch(api(`/api/admin/choices`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            story_version_id: versionId,
            from_node_id: fromNodeId,
            genre_key: label.trim(),
            to_node_id: toNodeId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create failed");
      }

      resetForm();
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this choice?")) return;

    try {
      setErr("");
      const res = await fetch(api(`/api/admin/choices/${id}`), {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    }
  }

  const fromNode = nodesById.get(fromNodeId);
  const toNode = nodesById.get(toNodeId);

  return (
    <AdminShell title="Choices (Branching)">
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
            href={`/admin/stories/${storyId}/nodes`}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
          >
            ← Manage Nodes
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
            {editingId ? "Edit Choice" : "Add Choice"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            “Label” is stored in DB as <span className="font-mono">genre_key</span>.
            Use it like button text: <b>“Go left”</b>, <b>“Fight”</b>, <b>“Run”</b>.
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-600">FROM Node</label>
              <select
                value={fromNodeId}
                onChange={(e) => setFromNodeId(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Select FROM node</option>
                {sortedNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    Step {n.step_no} • {n.node_code} • {n.title}
                  </option>
                ))}
              </select>
              {fromNode ? (
                <div className="mt-1 text-xs text-gray-500">
                  Preview: {fromNode.content.slice(0, 80)}
                  {fromNode.content.length > 80 ? "..." : ""}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs text-gray-600">Choice Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
                placeholder='e.g. "Open the door"'
              />
            </div>

            <div>
              <label className="text-xs text-gray-600">TO Node</label>
              <select
                value={toNodeId}
                onChange={(e) => setToNodeId(e.target.value)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Select TO node</option>
                {sortedNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    Step {n.step_no} • {n.node_code} • {n.title}
                  </option>
                ))}
              </select>
              {toNode ? (
                <div className="mt-1 text-xs text-gray-500">
                  Preview: {toNode.content.slice(0, 80)}
                  {toNode.content.length > 80 ? "..." : ""}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm"
              >
                {editingId ? "Update" : "Add"}
              </button>

              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50"
              >
                Clear
              </button>

              <button
                onClick={loadAll}
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
            <div className="text-sm font-semibold">Choices ({sortedChoices.length})</div>
            {loading ? <div className="text-xs text-gray-500">Loading...</div> : null}
          </div>

          {sortedChoices.length === 0 && !loading ? (
            <div className="mt-4 text-sm text-gray-500">
              No choices yet. Create nodes first, then add branching here.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {sortedChoices.map((c) => {
                const fn = nodesById.get(c.from_node_id);
                const tn = nodesById.get(c.to_node_id);

                return (
                  <div key={c.id} className="border rounded-xl p-3 flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {c.genre_key}
                      </div>

                      <div className="mt-1 text-xs text-gray-600">
                        <span className="font-mono">
                          {fn ? `Step ${fn.step_no} • ${fn.node_code}` : c.from_node_code || "?"}
                        </span>
                        {"  "}
                        →{"  "}
                        <span className="font-mono">
                          {tn ? `Step ${tn.step_no} • ${tn.node_code}` : c.to_node_code || "?"}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        From: <b>{fn?.title || c.from_title || "—"}</b> • To:{" "}
                        <b>{tn?.title || c.to_title || "—"}</b>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="px-3 py-2 rounded-xl border text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            Tip: ek node se multiple choices add kar sakte ho. Example: <b>Fight</b>, <b>Run</b>, <b>Negotiate</b>.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
