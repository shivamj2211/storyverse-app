import React from "react";
import "./globals.css";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { AlertProvider } from "../components/AlertProvider";

export const metadata = {
  title: "Storyverse",
  description: "Interactive storytelling platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
        <AlertProvider>
          <NavBar />
          <main
            className="container"
            style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem" }}
          >
            {children}
          </main>
          <Footer />
        </AlertProvider>
      </body>
    </html>
  );
}
