"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api, authHeaders, getToken } from "../app/lib/api";
import ModesMenu from "./ModesMenu";

interface User {
  id: string;
  email?: string;
  phone?: string;
  coins?: number;
  is_admin: boolean;
  is_premium: boolean;
}

function displayNameFromEmail(email?: string) {
  if (!email) return "Reader";
  const local = email.split("@")[0] || "Reader";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  const first = cleaned.split(" ")[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function initialsFromEmail(email?: string) {
  if (!email) return "R";
  const local = email.split("@")[0] || "R";
  const first = local[0] || "R";
  const second = local[1] || "";
  return (first + second).toUpperCase();
}

type NavItem = { href: string; label: string; authOnly?: boolean };

export default function NavBar() {
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadMe = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(api("/api/auth/me"), {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setUser(data.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();

    const onAuthChanged = () => loadMe();
    window.addEventListener("authChanged", onAuthChanged);

    return () => {
      window.removeEventListener("authChanged", onAuthChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.dispatchEvent(new Event("authChanged"));
    window.location.href = "/login";
  };

  const name = useMemo(() => displayNameFromEmail(user?.email), [user?.email]);
  const initials = useMemo(() => initialsFromEmail(user?.email), [user?.email]);
  const coins = Number(user?.coins ?? 0);

  const navItems: NavItem[] = useMemo(
    () => [
      { href: "/stories", label: "Stories" },
      { href: "/library", label: "Library", authOnly: true },
      { href: "/saved", label: "Saved", authOnly: true },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const LinkPill = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={[
          "px-3 py-2 rounded-full text-sm transition whitespace-nowrap",
          active
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/25"
            : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800",
        ].join(" ")}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50">
      <div
        className={[
          "backdrop-blur",
          "supports-[backdrop-filter]:bg-white/70 bg-white/95",
          "dark:supports-[backdrop-filter]:bg-zinc-900/70 dark:bg-zinc-900",
          "border-b border-slate-200 dark:border-zinc-700",
        ].join(" ")}
      >
        <nav className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-2">
            {/* Left: Brand + main links */}
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-2 group min-w-0">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 18h10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <div className="leading-tight min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-slate-950 dark:group-hover:text-white truncate">
                    Storyverse
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 -mt-0.5 hidden sm:block">
                    Read • Choose • Continue
                  </div>
                </div>
              </Link>

              {/* Desktop links */}
              <div className="hidden md:flex items-center gap-1 ml-2">
                {navItems
                  .filter((x) => (x.authOnly ? !!user : true))
                  .map((item) => (
                    <LinkPill key={item.href} href={item.href} label={item.label} />
                  ))}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Premium CTA */}
              {!loading && (
                <Link
                  href="/premium"
                  className={[
                    "hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition whitespace-nowrap",
                    user?.is_premium
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/25"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
                  ].join(" ")}
                >
                  <span className="inline-flex">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 19h14l-1.5-10-5.5 6-5.5-6L5 19Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.5 9 12 5l4.5 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {user?.is_premium ? "Premium Active" : "Go Premium"}
                </Link>
              )}

              {/* Auth area */}
              {loading ? null : user ? (
                <div className="flex items-center gap-2">
                  {/* Theme button */}
                  <ModesMenu />

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                      aria-label="Open user menu"
                    >
                      <span className="hidden sm:inline text-sm text-slate-700 dark:text-zinc-200">
                        Hi,{" "}
                        <span className="font-semibold text-slate-900 dark:text-zinc-100">
                          {name}
                        </span>
                      </span>

                      <span className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30 inline-flex items-center justify-center font-semibold">
                        {initials}
                      </span>

                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-slate-500 dark:text-zinc-400 hidden sm:block"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-700">
                          <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                            {name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                            {user.email || "Signed in"}
                          </div>

                          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/25 px-3 py-1 text-xs font-semibold">
                            🪙 {coins} Coins
                          </div>
                        </div>

                        <div className="p-2">
                          {[
                            { href: "/library", label: "Library" },
                            { href: "/wallet", label: "Wallet" },
                            { href: "/profile", label: "Profile" },
                            { href: "/premium", label: "Premium" },
                          ].map((x) => (
                            <Link
                              key={x.href}
                              href={x.href}
                              className="block px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            >
                              {x.label}
                            </Link>
                          ))}

                          {user.is_admin && (
                            <Link
                              href="/admin"
                              className="block px-3 py-2 rounded-xl text-sm text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2"
                            >
                              🔧 Admin Dashboard
                            </Link>
                          )}

                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-full text-sm !bg-slate-200 !text-slate-700 hover:!bg-slate-100 transition whitespace-nowrap"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 rounded-full text-sm font-medium !bg-slate-900 !text-white hover:!text-white hover:bg-slate-950 transition shadow-sm whitespace-nowrap"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          {mobileOpen && (
            <div className="md:hidden pb-4">
              <div className="mt-2 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                <div className="p-2">
                  <div className="px-1 py-2">
                    <ModesMenu />
                  </div>

                  <Link
                    href="/stories"
                    className="block px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    Stories
                  </Link>

                  {user && (
                    <>
                      <div className="px-3 py-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/25 px-3 py-1 text-xs font-semibold">
                          🪙 {coins} Coins
                        </div>
                      </div>

                      {[
                        { href: "/library", label: "Library" },
                        { href: "/saved", label: "Saved" },
                        { href: "/wallet", label: "Wallet" },
                        { href: "/profile", label: "Profile" },
                      ].map((x) => (
                        <Link
                          key={x.href}
                          href={x.href}
                          className="block px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        >
                          {x.label}
                        </Link>
                      ))}

                      <Link
                        href="/premium"
                        className={[
                          "block px-3 py-2 rounded-xl text-sm font-medium",
                          user.is_premium
                            ? "text-emerald-800 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-500/15"
                            : "text-white bg-emerald-600 hover:bg-emerald-700",
                        ].join(" ")}
                      >
                        {user.is_premium ? "Premium Active" : "Go Premium"}
                      </Link>

                      {user.is_admin && (
                        <Link
                          href="/admin"
                          className="block px-3 py-2 rounded-xl text-sm text-amber-700 dark:text-amber-300 font-medium hover:bg-amber-50 dark:hover:bg-amber-500/10"
                        >
                          🔧 Admin Dashboard
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        Logout
                      </button>
                    </>
                  )}

                  {!user && (
                    <div className="grid grid-cols-2 gap-2 p-2">
                      <Link
                        href="/login"
                        className="text-center px-4 py-2 rounded-xl text-sm text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 transition whitespace-nowrap"
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="text-center px-4 py-2 rounded-xl text-sm font-medium !bg-slate-900 !text-white hover:!text-white hover:bg-slate-950 transition whitespace-nowrap"
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
