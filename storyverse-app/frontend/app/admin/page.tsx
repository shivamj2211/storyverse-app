"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminShell from "../../components/admin/AdminShell";

export default function AdminHome() {
  const pathname = usePathname();
  console.log("✅ Admin Dashboard Page Loaded - Pathname:", pathname);

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-4">
        <div>
          <h2 className="!text-xl font-semibold">Admin Dashboard</h2>
          <p className="!text-sm !text-gray-600 mt-1">
            Quick links to manage content and platform settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Story Management */}
          <Link
            href="/admin/stories"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Manage Stories</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  Create, edit, and publish stories with chapter management.
                </div>
              </div>
              <div className="!text-2xl">📖</div>
            </div>
          </Link>

          {/* Chapters Management */}
          <Link
            href="/admin/stories"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Manage Chapters</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  Add, update, or remove chapters from stories.
                </div>
              </div>
              <div className="!text-2xl">📄</div>
            </div>
          </Link>

          {/* Genres Management */}
          <Link
            href="/admin/genres"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Manage Genres</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  Add, edit, or remove story genres and categories.
                </div>
              </div>
              <div className="!text-2xl">🏷️</div>
            </div>
          </Link>

          {/* Users Management */}
          <Link
            href="/admin/users"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Manage Users</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  View users, manage roles, and control permissions.
                </div>
              </div>
              <div className="!text-2xl">👥</div>
            </div>
          </Link>

          {/* Rewards Management */}
          <Link
            href="/admin/rewards"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Manage Rewards</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  Create and configure user rewards and incentives.
                </div>
              </div>
              <div className="!text-2xl">🎁</div>
            </div>
          </Link>

          {/* Coins Management */}
          <Link
            href="/admin/coins"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Manage Coins</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  Adjust user coin balances and view coin history.
                </div>
              </div>
              <div className="!text-2xl">💰</div>
            </div>
          </Link>

          {/* Transactions Management */}
          <Link
            href="/admin/transactions"
            className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:bg-slate-50 transition hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold !text-slate-900">Transactions</div>
                <div className="!text-sm !text-slate-600 mt-1">
                  View and export transaction history and analytics.
                </div>
              </div>
              <div className="!text-2xl">📊</div>
            </div>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
