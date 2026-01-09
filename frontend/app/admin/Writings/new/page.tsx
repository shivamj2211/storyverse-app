"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { api, authHeaders, getToken } from "../../../lib/api";

export default function AdminNewWritingPage() {
  const token = useMemo(() => getToken(), []);
  const [type, setType] = useState<"shayari"|"poem"|"kids"|"micro"|"thought">("shayari");
  const [language, setLanguage] = useState<"hi"|"en"|"hinglish">("hi");
  const [isEditorsPick, setIsEditorsPick] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function create() {
    setErr(""); setOk("");
    try {
      const res = await fetch(api("/api/admin/writings"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          type,
          language,
          title: title.trim() ? title.trim() : null,
          content,
          isEditorsPick,
        }),
      });

      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(json?.error || "Failed to create");

      setOk("Published to Explore ✅");
      setTitle("");
      setContent("");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-700 dark:text-zinc-300">Please login as admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Add Explore Content</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">This publishes instantly (approved).</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/writings" className="rounded-xl bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900 dark:text-zinc-100">
            Moderation
          </Link>
          <Link href="/explore" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
            View Explore
          </Link>
        </div>
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

        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={isEditorsPick} onChange={(e)=>setIsEditorsPick(e.target.checked)} />
          Mark as Editor’s Pick ⭐
        </label>

        <label className="mt-4 block text-sm text-zinc-700 dark:text-zinc-300">
          Title (optional)
          <input value={title} onChange={(e)=>setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" />
        </label>

        <label className="mt-4 block text-sm text-zinc-700 dark:text-zinc-300">
          Content
          <textarea value={content} onChange={(e)=>setContent(e.target.value)}
            className="mt-1 min-h-[180px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" />
        </label>

        <button
          onClick={create}
          disabled={!content.trim()}
          className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Publish
        </button>
      </div>
    </div>
  );
}
