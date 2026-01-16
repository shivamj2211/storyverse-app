import Link from "next/link";
import { Facebook, Instagram, Send, X } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 bg-black text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-12">
        {/* Top Grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="text-lg font-semibold tracking-wide">
              StoryVerse
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              StoryVerse is a modern storytelling platform where readers explore
              immersive stories and creators build worlds.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-wide">
              Quick Links
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/explore" className="hover:text-white">
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/premium" className="hover:text-white">
                  Premium
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-wide">
              Legal
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="hover:text-white">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-wide">
              Contact
            </div>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@storyverse.in"
                  className="hover:text-white"
                >
                  support@storyverse.in
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-gray-800" />

        {/* Bottom */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} StoryVerse. All rights reserved.
          </div>

          {/* Social Icons */}
          <div className="flex justify-center gap-3 sm:justify-end">
            <Social href="https://facebook.com">
              <Facebook size={16} />
            </Social>
            <Social href="https://instagram.com">
              <Instagram size={16} />
            </Social>
            <Social href="https://t.me">
              <Send size={16} />
            </Social>
            <Social href="https://x.com">
              <X size={16} />
            </Social>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Social({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition"
    >
      {children}
    </a>
  );
}
