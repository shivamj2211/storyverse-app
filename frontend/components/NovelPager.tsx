"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, authHeaders } from "../app/lib/api"; // ✅ adjust path if needed

type Props = {
  text: string;
  runId: string;
  nodeId: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function splitIntoPagesByApprox(text: string, charsPerPage: number): string[] {
  const clean = (text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [""];

  const parts = clean.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);

  const pages: string[] = [];
  let buf = "";

  const pushBuf = () => {
    pages.push(buf.trim());
    buf = "";
  };

  for (const para of parts) {
    const addition = (buf ? "\n\n" : "") + para;

    if ((buf + addition).length <= charsPerPage) {
      buf += addition;
      continue;
    }

    if (buf) pushBuf();

    if (para.length > charsPerPage) {
      const words = para.split(/\s+/);
      let line = "";
      for (const w of words) {
        const candidate = line ? line + " " + w : w;
        if (candidate.length > charsPerPage) {
          pages.push(line.trim());
          line = w;
        } else {
          line = candidate;
        }
      }
      if (line.trim()) pages.push(line.trim());
    } else {
      buf = para;
    }
  }

  if (buf.trim()) pushBuf();
  return pages.length ? pages : [clean];
}

export default function NovelPager({ text, runId, nodeId }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [pages, setPages] = useState<string[]>([""]);
  const [pageIndex, setPageIndex] = useState(0);
  const [bookmarkIndex, setBookmarkIndex] = useState<number | null>(null);
  const [fontPx, setFontPx] = useState<number>(16);
  const [gotoValue, setGotoValue] = useState("");

  const [isTurning, setIsTurning] = useState<null | "next" | "prev">(null);
  const touchStartX = useRef<number | null>(null);

  const saveTimer = useRef<any>(null);

  // ✅ Load state from DB when node changes
  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const res = await fetch(
          api(`/api/runs/${runId}/reading-state?nodeId=${encodeURIComponent(nodeId)}`),
          { headers: { ...authHeaders() }, cache: "no-store" }
        );

        const data = await res.json().catch(() => ({}));
        const st = data?.state;

        if (cancelled) return;

        if (st) {
          setFontPx(st.font_px ? clamp(Number(st.font_px), 14, 22) : 16);
          setPageIndex(st.page_index ? Number(st.page_index) : 0);
          setBookmarkIndex(
            st.bookmark_page_index === null || st.bookmark_page_index === undefined
              ? null
              : Number(st.bookmark_page_index)
          );
        } else {
          // fresh chapter
          setFontPx(16);
          setPageIndex(0);
          setBookmarkIndex(null);
        }
      } catch {
        // ignore
      }
    }

    if (runId && nodeId) loadState();
    return () => {
      cancelled = true;
    };
  }, [runId, nodeId]);

  // Repaginate on size/font changes
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const measure = measureRef.current;
    if (!frame || !measure) return;

    const compute = () => {
      const rect = frame.getBoundingClientRect();
      const height = rect.height;

      const styles = window.getComputedStyle(measure);
      const lineHeight = parseFloat(styles.lineHeight || "20") || 20;
      const linesPerPage = clamp(Math.floor(height / lineHeight) - 1, 18, 30);

      const probe = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const w = measure.scrollWidth || measure.getBoundingClientRect().width;
      const avgCharWidth = w / probe.length || 8;

      const charsPerLine = clamp(Math.floor(rect.width / avgCharWidth), 35, 90);
      const charsPerPage = linesPerPage * charsPerLine;

      const newPages = splitIntoPagesByApprox(text, charsPerPage);
      setPages(newPages);

      const maxIdx = Math.max(0, newPages.length - 1);
      setPageIndex((p) => clamp(p, 0, maxIdx));
      setBookmarkIndex((b) => (b == null ? null : clamp(b, 0, maxIdx)));
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(frame);

    // @ts-ignore
    document.fonts?.ready?.then?.(() => compute());

    return () => ro.disconnect();
  }, [text, fontPx]);

  const total = pages.length;
  const current = pages[pageIndex] ?? "";

  // ✅ Save state to DB (debounced)
  const scheduleSave = (next: {
    pageIndex?: number;
    bookmarkIndex?: number | null;
    fontPx?: number;
  }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(api(`/api/runs/${runId}/reading-state`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            nodeId,
            pageIndex: next.pageIndex ?? pageIndex,
            bookmarkPageIndex:
              next.bookmarkIndex === undefined ? bookmarkIndex : next.bookmarkIndex,
            fontPx: next.fontPx ?? fontPx,
          }),
        });
      } catch {
        // ignore
      }
    }, 300);
  };

  useEffect(() => {
    // page change should save
    scheduleSave({ pageIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  useEffect(() => {
    scheduleSave({ fontPx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontPx]);

  const goNext = () => {
    if (pageIndex >= total - 1) return;
    setIsTurning("next");
    setTimeout(() => {
      setPageIndex((p) => clamp(p + 1, 0, total - 1));
      setIsTurning(null);
    }, 220);
  };

  const goPrev = () => {
    if (pageIndex <= 0) return;
    setIsTurning("prev");
    setTimeout(() => {
      setPageIndex((p) => clamp(p - 1, 0, total - 1));
      setIsTurning(null);
    }, 220);
  };

  // Bookmark
  const saveBookmark = () => {
    setBookmarkIndex(pageIndex);
    scheduleSave({ bookmarkIndex: pageIndex });
  };

  const goBookmark = () => {
    if (bookmarkIndex == null) return;
    setPageIndex(clamp(bookmarkIndex, 0, total - 1));
  };

  const clearBookmark = () => {
    setBookmarkIndex(null);
    scheduleSave({ bookmarkIndex: null });
  };

  const onGoto = () => {
    const n = parseInt(gotoValue, 10);
    if (Number.isNaN(n)) return;
    setPageIndex(clamp(n - 1, 0, total - 1));
    setGotoValue("");
  };

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  };

  const turnClass =
    isTurning === "next" ? "novel-turn-next" : isTurning === "prev" ? "novel-turn-prev" : "";

  return (
    <div className="novel-wrap" ref={wrapRef}>
      <div className="novel-topbar">
        <div className="novel-pagecount">
          Page <b>{pageIndex + 1}</b> / {total}
          {bookmarkIndex != null ? (
            <span className="novel-bm"> • Bookmarked: <b>{bookmarkIndex + 1}</b></span>
          ) : (
            <span className="novel-bm"> • No bookmark</span>
          )}
        </div>

        <div className="novel-progress" aria-hidden="true">
          <div
            className="novel-progress-fill"
            style={{ width: `${total ? ((pageIndex + 1) / total) * 100 : 0}%` }}
          />
        </div>

        <div className="novel-tools">
          <button type="button" className="novel-iconbtn" onClick={() => setFontPx((v) => clamp(v - 1, 14, 22))}>
            A−
          </button>
          <button type="button" className="novel-iconbtn" onClick={() => setFontPx((v) => clamp(v + 1, 14, 22))}>
            A+
          </button>

          <button type="button" className="novel-iconbtn" onClick={saveBookmark} title="Save bookmark">
            🔖
          </button>
          <button type="button" className="novel-iconbtn" onClick={goBookmark} disabled={bookmarkIndex == null} title="Go bookmark">
            ↩︎
          </button>
          <button type="button" className="novel-iconbtn" onClick={clearBookmark} disabled={bookmarkIndex == null} title="Clear bookmark">
            ⨯
          </button>

          <button type="button" className="novel-iconbtn" onClick={toggleFullscreen} title="Fullscreen">
            ⛶
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="novel-frame"
        onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          if (start == null || end == null) return;
          const dx = end - start;
          if (dx < -45) goNext();
          if (dx > 45) goPrev();
          touchStartX.current = null;
        }}
      >
        <div className={`novel-page ${turnClass}`}>
          <div className="novel-text" style={{ fontSize: `${fontPx}px` }}>
            {current.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        <div className="novel-measure" ref={measureRef} style={{ fontSize: `${fontPx}px` }}>
          abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
        </div>
      </div>

      <div className="novel-controls">
        <button type="button" onClick={goPrev} disabled={pageIndex === 0} className="novel-btn">
          ← Previous
        </button>

        <div className="novel-mid">
          <div className="novel-hint">Swipe / ← → • + − font • 🔖 bookmark</div>

          <div className="novel-goto">
            <input
              value={gotoValue}
              onChange={(e) => setGotoValue(e.target.value)}
              placeholder="Go to page"
              inputMode="numeric"
              className="novel-goto-input"
            />
            <button type="button" onClick={onGoto} className="novel-goto-btn">
              Go
            </button>
          </div>
        </div>

        <button type="button" onClick={goNext} disabled={pageIndex >= total - 1} className="novel-btn novel-btn-primary">
          Next →
        </button>
      </div>
    </div>
  );
}
