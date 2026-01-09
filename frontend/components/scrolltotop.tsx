"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Brand = "emerald" | "violet" | "custom";

export default function ScrollToTop({
  brand = "emerald",
  customColor = "#16A34A", // emerald-600 default
}: {
  brand?: Brand;
  customColor?: string; // used only when brand="custom"
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0); // raw 0..1
  const [smoothProgress, setSmoothProgress] = useState(0); // eased 0..1
  const btnRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef<number | null>(null);

  const ringColor = useMemo(() => {
    if (brand === "emerald") return "#16A34A"; // emerald-600
    if (brand === "violet") return "#7C3AED"; // violet-600
    return customColor || "#16A34A";
  }, [brand, customColor]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      const percent = docHeight > 0 ? scrollTop / docHeight : 0;
      const clamped = Math.min(1, Math.max(0, percent));

      setProgress(clamped);
      setVisible(clamped > 0.3);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // init
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Smooth/eased animation towards progress (requestAnimationFrame)
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const animate = () => {
      setSmoothProgress((prev) => {
        // Easing: move a fraction of the distance each frame (critically damped feel)
        const next = prev + (progress - prev) * 0.18;
        // snap when close
        if (Math.abs(next - progress) < 0.001) return progress;
        return next;
      });

      if (Math.abs(smoothProgress - progress) >= 0.001) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Magnet hover effect (desktop only feel)
  const onMouseMove = (e: React.MouseEvent) => {
    const el = btnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
  };

  const onMouseLeave = () => {
    if (btnRef.current) btnRef.current.style.transform = "translate(0,0)";
  };

  if (!visible) return null;

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - smoothProgress * circumference;

  return (
    <button
      ref={btnRef}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      aria-label="Scroll to top"
      className="
        fixed bottom-5 right-5 z-50
        flex items-center justify-center
        rounded-full
        bg-white text-black
        dark:bg-black dark:text-white
        shadow-lg
        transition-all duration-300
        active:scale-95
        h-9 w-9 md:h-11 md:w-11
      "
    >
      {/* Progress Ring */}
      <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 44 44">
        {/* Track */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          opacity="0.15"
        />
        {/* Progress */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          stroke={ringColor}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>

      {/* Arrow */}
      <span className="relative text-sm md:text-base font-bold">↑</span>
    </button>
  );
}
