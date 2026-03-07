import type { Metadata } from "next";
import "../styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "GodLocal — Your AI. Your Machine.",
  description:
    "The fastest local AI inference platform. 17,000 tokens/sec, autonomous agents with memory and emotions, 5-tier smart routing. Open Core. Runs on iPhone.",
  metadataBase: new URL("https://godlocal.ai"),
  keywords: [
    "local AI",
    "AI inference",
    "autonomous agents",
    "local LLM",
    "self-hosted AI",
    "AI platform",
    "open source AI",
    "Solana DeFi",
    "crypto terminal",
    "GodLocal",
  ],
  authors: [{ name: "GodLocal", url: "https://godlocal.ai" }],
  creator: "GodLocal",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://godlocal.ai",
    siteName: "GodLocal",
    title: "GodLocal — Your AI. Your Machine.",
    description:
      "The fastest local AI inference platform. 17k tok/s, autonomous agents, 5-tier routing. Open Core — community edition free forever.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GodLocal — Autonomous AI Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GodLocal — Your AI. Your Machine.",
    description:
      "17k tok/s. Autonomous agents. 5-tier smart routing. Open Core. Runs on iPhone.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://godlocal.ai",
  },
};


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#060810] text-[#E0E0E0] antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
