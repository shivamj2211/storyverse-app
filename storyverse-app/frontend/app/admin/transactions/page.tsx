"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import AdminTable from "../../../components/admin/AdminTable";
import { api, authHeaders } from "../../lib/api";

interface Transaction {
  id: string;
  user_id: string;
  story_id: string;
  rating: number;
  created_at: string;
  user_email?: string;
  story_title?: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "user" | "date">("all");
  const [filterValue, setFilterValue] = useState("");

  useEffect(() => {
    loadTransactions();
  }, [filterType, filterValue]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = "/api/admin/transactions";

      if (filterType === "user" && filterValue) {
        endpoint = `/api/admin/transactions/user/${filterValue}`;
      } else if (filterType === "date" && filterValue) {
        endpoint = `/api/admin/transactions/date/${filterValue}`;
      }

      const res = await fetch(api(endpoint), {
        method: "GET",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load transactions");
      }

      const data = await res.json();
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch("/api/admin/transactions/export", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || "Failed to export CSV");
    }
  };

  const columns = [
    { key: "user_email", label: "User" },
    { key: "story_title", label: "Story" },
    {
      key: "rating",
      label: "Rating",
      render: (val: number) => (
        <span className="flex gap-0.5">
          {Array.from({ length: val }).map((_, i) => (
            <span key={i} className="text-amber-400">
              ★
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <AdminShell title="Transactions & Ratings">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs text-slate-600 mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-900">{transactions.length}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-600 mb-1">Avg Rating</p>
            <p className="text-2xl font-bold text-amber-900">
              {transactions.length > 0
                ? (
                    transactions.reduce((sum, t) => sum + t.rating, 0) /
                    transactions.length
                  ).toFixed(1)
                : "0"}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-xs text-emerald-600 mb-1">Total Rated Stories</p>
            <p className="text-2xl font-bold text-emerald-900">
              {new Set(transactions.map((t) => t.story_id)).size}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setFilterValue("");
              }}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Transactions</option>
              <option value="user">Filter by User ID</option>
              <option value="date">Filter by Date</option>
            </select>

            {filterType !== "all" && (
              <input
                type={filterType === "date" ? "date" : "text"}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder={filterType === "user" ? "User ID..." : "Date"}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <AdminTable
          columns={columns}
          data={transactions}
          loading={loading}
          error={error}
          keyField="id"
        />
      </div>
    </AdminShell>
  );
}
