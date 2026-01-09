"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";

export default function ModesMenu() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  const effectiveTheme = theme === "system" ? systemTheme : theme;
  const icon = effectiveTheme === "dark" ? "🌙" : "☀️";

  const Panel = (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-wide opacity-70 text-slate-700 dark:text-slate-300">
        Theme
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setTheme("light")}
          className={`rounded-xl px-3 py-3 text-sm border transition
            ${theme === "light"
              ? "border-black/40 dark:border-white/40"
              : "border-black/10 dark:border-white/15 hover:border-black/20 dark:hover:border-white/25"
            } text-slate-900 dark:text-white`}
        >
          Light
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`rounded-xl px-3 py-3 text-sm border transition
            ${theme === "dark"
              ? "border-black/40 dark:border-white/40"
              : "border-black/10 dark:border-white/15 hover:border-black/20 dark:hover:border-white/25"
            } text-slate-900 dark:text-white`}
        >
          Dark
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`rounded-xl px-3 py-3 text-sm border transition
            ${theme === "system"
              ? "border-black/40 dark:border-white/40"
              : "border-black/10 dark:border-white/15 hover:border-black/20 dark:hover:border-white/25"
            } text-slate-900 dark:text-white`}
        >
          System
        </button>
      </div>
    </div>
  );

  const DesktopDropdown = (
    <>
      <button
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[9998]"
        aria-label="Close"
      />
      <div className="absolute right-0 mt-2 z-[9999] w-72 rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-950 shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-slate-900 dark:text-white">Theme</div>
          <button
            onClick={() => setOpen(false)}
            className="h-9 w-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {Panel}
      </div>
    </>
  );

  const MobileSheet = createPortal(
    <>
      <button
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[9998] bg-black/40"
        aria-label="Close"
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-[9999] rounded-t-2xl border-t border-black/10 dark:border-white/15 bg-white dark:bg-zinc-950 shadow-2xl p-4"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-slate-900 dark:text-white">Theme</div>
          <button
            onClick={() => setOpen(false)}
            className="h-9 w-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {Panel}
      </div>
    </>,
    document.body
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        aria-label="Theme"
        className="inline-flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 transition"
        title="Theme"
      >
        <span className="text-base">{icon}</span>
      </button>

      {open && (isMobile ? MobileSheet : DesktopDropdown)}
    </div>
  );
}
