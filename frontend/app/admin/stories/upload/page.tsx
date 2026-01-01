"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AdminShell from "../../../../components/admin/AdminShell";
import { api, authHeaders, getToken } from "../../../lib/api";

type ImportResult = {
  ok?: boolean;
  story?: { id: string; title?: string; slug?: string };
  version?: { id: string; versionName?: string; isPublished?: boolean };
  nodesInserted?: number;
  choicesInserted?: number;
  warnings?: string[];
  error?: string;
};

export default function AdminUploadStoryJsonPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const storyIdFromQuery = sp.get("storyId") || "";

  const [fileName, setFileName] = useState<string>("");
  const [jsonText, setJsonText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string>("");

  const canSubmit = useMemo(() => {
    return jsonText.trim().length > 0 && !loading;
  }, [jsonText, loading]);

  async function onPickFile(file: File) {
    setResult(null);
    setErr("");
    setFileName(file.name);

    const text = await file.text();
    setJsonText(text);
  }

  async function submit() {
    try {
      setErr("");
      setResult(null);

      const token = getToken();
      if (!token) throw new Error("Not logged in");

      // Validate JSON early (so user gets immediate error)
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error("Invalid JSON. Please upload a valid JSON file.");
      }

      // If storyId is provided in query, enforce it in payload (safe + explicit)
      // Your backend import already supports story creation, but this helps when importing into existing story.
      if (storyIdFromQuery) {
  parsed.story = parsed.story || {};
  parsed.story.id = storyIdFromQuery;
}


      setLoading(true);

      const res = await fetch(api("/api/admin/story-import"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(parsed),
      });

     let data: any = null;
try {
  data = await res.json();
} catch {
  data = null;
}

if (!res.ok) {
  const msg =
    data?.error ||
    data?.message ||
    (typeof data === "string" ? data : null) ||
    `Import failed: ${res.status}`;
  throw new Error(msg);
}

setResult(data as ImportResult);

      setResult(data);
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const storyId = result?.story?.id || storyIdFromQuery || "";
  const versionId = result?.version?.id || "";

  return (
    <AdminShell title="Upload / Import Story JSON">
      <div className="text-sm text-gray-700">
        Yaha se tum ek hi JSON me story + nodes + choices import kar sakte ho.
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Tip: Agar <span className="font-mono">?storyId=</span> pass kiya hai, import usi story me jayega.
      </div>

      {storyIdFromQuery ? (
        <div className="mt-3 rounded-xl border bg-gray-50 p-3 text-xs">
          Import target storyId: <span className="font-mono">{storyIdFromQuery}</span>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        {/* Left: Upload / paste */}
        <div className="border rounded-2xl p-4 h-fit">
          <div className="text-sm font-semibold">Import JSON</div>
          <div className="text-xs text-gray-500 mt-1">
            Upload a JSON file OR paste JSON below.
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-600">Upload JSON file</label>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                }}
                className="mt-1 block w-full text-sm"
              />
              {fileName ? (
                <div className="mt-1 text-xs text-gray-500">
                  Selected: <span className="font-mono">{fileName}</span>
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs text-gray-600">Or paste JSON</label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={12}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-sm font-mono"
                placeholder='{"title":"...", "nodes":[...], "choices":[...]}'
              />
            </div>

            {err ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className={[
                "w-full px-4 py-2 rounded-xl text-sm",
                canSubmit
                  ? "bg-gray-900 text-white"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "Importing..." : "Import JSON"}
            </button>
          </div>
        </div>

        {/* Right: Result */}
        <div className="border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Result</div>
            <button
              onClick={() => {
                setResult(null);
                setErr("");
              }}
              className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          </div>

          {!result ? (
            <div className="mt-4 text-sm text-gray-500">
              Import output yaha show hoga. Successful import ke baad buttons active ho jayenge.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border bg-green-50 border-green-200 p-3 text-sm text-green-800">
                Import successful ✅
              </div>

              <div className="text-xs text-gray-600">
                <div>
                  Story ID: <span className="font-mono">{storyId || "—"}</span>
                </div>
                <div className="mt-1">
                  Version ID: <span className="font-mono">{versionId || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border p-3">
                  Nodes inserted:{" "}
                  <b>{(result.nodesInserted ?? 0).toLocaleString()}</b>
                </div>
                <div className="rounded-xl border p-3">
                  Choices inserted:{" "}
                  <b>{(result.choicesInserted ?? 0).toLocaleString()}</b>
                </div>
              </div>

              {result.warnings?.length ? (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  <div className="font-semibold text-xs mb-1">Warnings</div>
                  <ul className="list-disc ml-4 text-xs">
                    {result.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                {storyId ? (
                  <>
                    <Link
                      href={`/admin/stories/${storyId}`}
                      className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                    >
                      Open Story
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
                  </>
                ) : null}

                <button
                  onClick={() => router.push("/admin/stories")}
                  className="px-3 py-2 rounded-xl border text-sm hover:bg-gray-50"
                >
                  All Stories
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Next step: Story detail page se version <b>Publish</b> kar do.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick help */}
      <div className="mt-8 border rounded-2xl p-4">
        <div className="text-sm font-semibold">Recommended Workflow</div>
        <ol className="mt-2 list-decimal ml-5 text-sm text-gray-700 space-y-1">
          <li>Create story / open story details</li>
          <li>Upload JSON (bulk) OR manually add nodes</li>
          <li>Build branching choices</li>
          <li>Publish the version</li>
          <li>Check reader-side story flow</li>
        </ol>
      </div>
    </AdminShell>
  );
}
