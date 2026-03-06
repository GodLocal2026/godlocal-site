import type { Metadata } from "next";
import "../styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "slonik52 🐘 — Solana Memecoin Terminal",
  description: "The fastest AI-powered Solana memecoin terminal. Real-time scanner, 4-agent hedge fund, native Phantom swap. No install.",
  metadataBase: new URL("https://godlocal.ai"),
  openGraph: {
    title: "slonik52 🐘 — Solana Memecoin Terminal",
    description: "Real-time scanner · 4-agent AI · Native Phantom swap · Free",
    url: "https://godlocal.ai",
    siteName: "slonik52",
  },
  twitter: {
    card: "summary_large_image",
    site: "@oassisx100",
    title: "slonik52 🐘 — Trade Solana memecoins smarter",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#060810] text-[#E0E0E0] antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
