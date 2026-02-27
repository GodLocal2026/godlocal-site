import type { Metadata } from "next";
import "../styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "GodLocal – Your AI. Your machine.",
  description: "The fastest local AI inference platform. Open source. Runs on iPhone. 17k tok/s, autonomous agents.",
  metadataBase: new URL("https://godlocal.ai"),
  openGraph: {
    title: "GodLocal – Your AI. Your machine.",
    description: "17k tok/s. Open source. iPhone ready.",
    url: "https://godlocal.ai",
    siteName: "GodLocal",
  },
  twitter: {
    card: "summary_large_image",
    site: "@kitbtc",
    title: "GodLocal – Your AI. Your machine.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0A0C0F] text-[#E0E0E0] antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}