import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { AlertProvider } from "../components/AlertProvider";
import ScrollToTop from "../components/scrolltotop";
import ThemeProvider from "../components/ThemeProvider";
import ScrollToTopOnRouteChange from "../components/ScrollToTopOnRouteChange";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Storyverse",
  description: "Interactive storytelling platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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

            <Footer />
            <ScrollToTop />
          </AlertProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
