"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../components/admin/AdminShell";
import AdminTable from "../../../components/admin/AdminTable";
import ConfirmDialog from "../../../components/admin/ConfirmDialog";
import { api, authHeaders } from "../../lib/api";

interface Chapter {
  id: string;
  story_id: string;
  version_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  story_title?: string;
}

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    chapter: null as Chapter | null,
  });

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(api("/api/admin/chapters"), {
        method: "GET",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load chapters");
      }

      const response = await res.json();
      setChapters(response);
    } catch (err: any) {
      setError(err.message || "Failed to load chapters");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!confirmDialog.chapter) return;

    try {
      const res = await fetch(api(`/api/admin/chapters/${confirmDialog.chapter.id}`), {
        method: "DELETE",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete chapter");
      }
      setChapters(chapters.filter((ch) => ch.id !== confirmDialog.chapter!.id));
      setConfirmDialog({ isOpen: false, chapter: null });
    } catch (err: any) {
      setError(err.message || "Failed to delete chapter");
    }
  };

  const columns = [
    { key: "story_title", label: "Story" },
    { key: "version_number", label: "Version", render: (val: number) => `v${val}` },
    { key: "title", label: "Chapter Title" },
    {
      key: "created_at",
      label: "Created",
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <AdminShell title="Chapters Management">
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-700">
            Total Chapters: <span className="font-semibold">{chapters.length}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <AdminTable
          columns={columns}
          data={chapters}
          loading={loading}
          error={error}
          keyField="id"
          actions={(chapter) => (
            <button
              onClick={() => setConfirmDialog({ isOpen: true, chapter })}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Delete
            </button>
          )}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Chapter"
        message={`Are you sure you want to delete the chapter "${confirmDialog.chapter?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleDeleteChapter}
        onCancel={() => setConfirmDialog({ isOpen: false, chapter: null })}
      />
    </AdminShell>
  );
}
