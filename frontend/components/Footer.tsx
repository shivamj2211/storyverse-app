import Link from "next/link";
import React from "react";
import { Facebook, Instagram, Send, X } from "lucide-react";

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold text-black/90 dark:text-white/90">
      {children}
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className="text-sm text-black/70 hover:text-black/90 dark:text-white/70 dark:hover:text-white/90"
      href={href}
    >
      {children}
    </Link>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border border-slate-300/60 text-slate-700",
        "bg-white/60 hover:bg-white",
        "transition",
        "hover:border-slate-400 hover:text-slate-900",
        "focus:outline-none focus:ring-2 focus:ring-emerald-300/60",
        "dark:border-white/20 dark:text-white/70 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white",
      ].join(" ")}
    >
      {children}
    </a>
  );
}

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  // Simple WhatsApp mark (SVG) – no extra package needed
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.5 3.5A11 11 0 0 0 3.9 19.4L3 22l2.7-.9A11 11 0 0 0 20.5 3.5ZM12 20a9 9 0 0 1-4.6-1.2l-.3-.2-2.7.9.9-2.6-.2-.3A9 9 0 1 1 12 20Zm5-6.1c-.3-.2-1.7-.8-2-.9s-.5-.2-.7.2-.8.9-1 .9-.4 0-.7-.2a7.4 7.4 0 0 1-2.2-2.7c-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.3-.6s0-.4 0-.6c0-.2-.7-1.7-1-2.4-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.5 1.9.6.8.3 1.6.3 2.2.2.7-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4-.1-.2-.3-.2-.6-.4Z" />
    </svg>
  );
}

export default function Footer() {
  // ✅ Replace these with your real URLs when ready
  const socials = {
    facebook: "https://facebook.com",
    whatsapp: "https://wa.me/", // add your number e.g. https://wa.me/91XXXXXXXXXX
    instagram: "https://instagram.com",
    telegram: "https://t.me/", // add your channel username
    x: "https://x.com", // add your profile
  };

  return (
    <footer className="mt-12 border-t border-black/10 bg-white dark:border-white/10 dark:bg-black">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="text-base font-semibold tracking-tight text-black/90 dark:text-white/90">
              StoryVerse
            </div>
            <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
              StoryVerse is a modern storytelling platform where readers explore
              immersive stories and creators build worlds.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <ColTitle>Quick Links</ColTitle>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/">Home</FooterLink>
              </li>
              <li>
                <FooterLink href="/explore">Explore</FooterLink>
              </li>
              <li>
                <FooterLink href="/genres">Genres</FooterLink>
              </li>
              <li>
                <FooterLink href="/premium">Premium</FooterLink>
              </li>

              {/* ✅ ADDED (without removing anything) */}
              <li>
                <FooterLink href="/about">About Us</FooterLink>
              </li>
              <li>
                <FooterLink href="/faq">FAQ</FooterLink>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <ColTitle>Legal</ColTitle>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
              </li>
              <li>
                <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
              </li>
              <li>
                <FooterLink href="/guidelines">Community Guidelines</FooterLink>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <ColTitle>Contact</ColTitle>
            <ul className="space-y-2">
              <li>
                <FooterLink href="/contact">Contact Us</FooterLink>
              </li>
              <li>
                <a
                  href="mailto:support@storyverse.in"
                  className="text-sm text-black/70 hover:text-black/90 dark:text-white/70 dark:hover:text-white/90"
                >
                  support@storyverse.in
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-black/10 pt-6 text-xs text-black/60 dark:border-white/10 dark:text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            © {new Date().getFullYear()} StoryVerse. All rights reserved.
          </div>

          {/* Social Icons - mobile safe */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <SocialIcon href={socials.facebook} label="Facebook">
              <Facebook size={16} />
            </SocialIcon>

            <SocialIcon href={socials.whatsapp} label="WhatsApp">
              <WhatsAppIcon size={16} />
            </SocialIcon>

            <SocialIcon href={socials.instagram} label="Instagram">
              <Instagram size={16} />
            </SocialIcon>

            <SocialIcon href={socials.telegram} label="Telegram">
              <Send size={16} />
            </SocialIcon>

            <SocialIcon href={socials.x} label="X">
              <X size={16} />
            </SocialIcon>
          </div>
        </div>
      </div>
    </footer>
  );
}
