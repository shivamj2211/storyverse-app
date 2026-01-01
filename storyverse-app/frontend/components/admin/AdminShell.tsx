"use client";

import React, { useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  useEffect(() => {
    console.log("🎨 AdminShell rendered with title:", title);
  }, [title]);
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <aside className="lg:sticky lg:top-4 h-fit">
            <AdminSidebar />
          </aside>

          <main className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <AdminTopbar title={title} />
            <div className="p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
