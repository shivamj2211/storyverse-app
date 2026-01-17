import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { AlertProvider } from "../components/AlertProvider";
import ScrollToTop from "../components/scrolltotop";
import ThemeProvider from "../components/ThemeProvider";
import ScrollToTopOnRouteChange from "../components/ScrollToTopOnRouteChange";
import CookieConsent from "../components/CookieConsent";
import type { Metadata, Viewport } from "next";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Storyverrse",
   description: "Interactive storytelling platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Storyverrse"
  },
  icons: {
    icon: [
      { url: "/icon/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon/icon-192.png" }]
  }
};

// ✅ themeColor yaha shift karo
export const viewport: Viewport = {
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`bg-white text-black dark:bg-black dark:text-white ${inter.className}`}>
        {/* 🌗 Theme provider must wrap everything */}
        <ThemeProvider>
          <AlertProvider>
            <ScrollToTopOnRouteChange />
            <NavBar />

            <main
              className="container"
              style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}
            >
              {children}
            </main>

            <CookieConsent />
            <Footer />
            <ScrollToTop />
          </AlertProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
