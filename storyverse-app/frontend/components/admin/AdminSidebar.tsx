"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/stories/upload", label: "Upload JSON" },

  // Next we will create these pages
  { href: "/admin/genres", label: "Genres" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/coins", label: "Coins" },
  { href: "/admin/rewards", label: "Reward Rules" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-3">
      <div className="px-2 py-2">
        <div className="text-lg font-semibold">Storyverse Admin</div>
        <div className="!text-xs !text-gray-500 mt-1">
          Manage stories, chapters, users & rewards
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {nav.map((item) => {
          const active = isActive(pathname || "", item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block px-3 py-2 rounded-xl !text-sm transition",
                active
                  ? "bg-gray-900 !text-white"
                  : "!text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t px-2">
        <Link
          href="/"
          className="!text-sm !text-gray-600 hover:!text-gray-900"
        >
          ← Back to app
        </Link>
      </div>
    </div>
  );
}
