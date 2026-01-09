"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, authHeaders, getToken } from "../lib/api";

export default function WritePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [type, setType] = useState<"shayari"|"poem"|"kids"|"micro"|"thought">("shayari");
  const [language, setLanguage] = useState<"hi"|"en"|"hinglish">("hi");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr(""); setOk("");
    if (!token) { router.push("/login"); return; }

    setLoading(true);
    try {
      const res = await fetch(api("/api/writings"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          type,
          language,
          title: title.trim() ? title.trim() : null,
          content,
        }),
      });

      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(json?.error || "Failed to submit");

      setOk("Submitted for review ✅");
      setTitle("");
      setContent("");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Write</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Submit your writing — admin will approve it for Explore.
          </p>
        </div>
        <Link href="/explore" className="text-sm font-medium underline text-zinc-800 dark:text-zinc-200">
          ← Explore
        </Link>
      </div>

      {err ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">{err}</div> : null}
      {ok ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">{ok}</div> : null}

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Type
            <select value={type} onChange={(e)=>setType(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <option value="shayari">Shayari</option>
              <option value="poem">Poem</option>
              <option value="kids">Kids</option>
              <option value="micro">Micro</option>
              <option value="thought">Thought</option>
            </select>
          </label>

          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Language
            <select value={language} onChange={(e)=>setLanguage(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <option value="hi">Hindi</option>
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm text-zinc-700 dark:text-zinc-300">
          Title (optional)
          <input value={title} onChange={(e)=>setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="e.g. Still Becoming"
          />
        </label>

        <label className="mt-4 block text-sm text-zinc-700 dark:text-zinc-300">
          Content
          <textarea value={content} onChange={(e)=>setContent(e.target.value)}
            className="mt-1 min-h-[180px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Write here..."
          />
        </label>

        <button
          onClick={submit}
          disabled={loading || !content.trim()}
          className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
