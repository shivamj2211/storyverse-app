"use client";

import React from "react";

export default function AdminTopbar({ title }: { title?: string }) {
  return (
    <div className="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">Admin Panel</div>
        <div className="text-base font-semibold">
          {title || "Dashboard"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 hidden sm:inline">
          Protected • Admin-only
        </span>
      </div>
    </div>
  );
}
