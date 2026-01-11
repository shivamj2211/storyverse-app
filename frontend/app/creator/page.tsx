"use client";

import RequireCreator from "../../components/RequireCreator";

export default function CreatorHome() {
  return (
    <RequireCreator>
      <main className="mx-auto max-w-5xl px-4 py-14">
        <h1 className="text-4xl font-extrabold">Creator Studio</h1>
        <p className="mt-2 text-slate-600">
          Create stories, publish chapters, manage your audience.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Create a new story</div>
            <div className="text-sm text-slate-600 mt-1">Start building your world.</div>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="font-semibold">Manage published stories</div>
            <div className="text-sm text-slate-600 mt-1">Edit content and track readers.</div>
          </div>
        </div>
      </main>
    </RequireCreator>
  );
}
