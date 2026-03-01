"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GITHUB_URL } from "@/lib/utils";

const nav = [
  { href: "/oasis", label: "Oasis", highlight: true },
  { href: "/product", label: "Product" },
  { href: "/community", label: "Community" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [alive, setAlive] = useState<boolean | null>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const ping = useCallback(async () => {
    try {
      const r = await fetch("https://godlocal-api.onrender.com/status", { signal: AbortSignal.timeout(4000) });
      const d = await r.json();
      setAlive(d.status === "ok");
    } catch {
      setAlive(false);
    }
  }, []);

  useEffect(() => {
    ping();
    const t = setInterval(ping, 30_000);
    return () => clearInterval(t);
  }, [ping]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0A0C0F]/90 backdrop-blur-md border-b border-[#333]/50" : "bg-transparent"}`}>
      <div className="container">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center">
              <span className="text-[#00FF9D] font-mono font-bold text-sm">G</span>
            </div>
            <span className="font-bold text-lg">God<span className="text-[#00FF9D]">Local</span></span>
            {alive !== null && (
              <span className="flex items-center gap-1 ml-1">
                <span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: alive ? "#00FF9D" : "#888", boxShadow: alive ? "0 0 5px rgba(0,255,157,0.7)" : undefined }} />
                <span style={{ fontSize: 10, fontFamily: "monospace", color: alive ? "rgba(0,255,157,0.6)" : "rgba(255,255,255,0.25)" }}>{alive ? "live" : ".."}</span>
              </span>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  item.highlight
                    ? "bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/25 hover:bg-[#00FF9D]/20"
                    : "text-[#E0E0E0]/60 hover:text-[#E0E0E0] hover:bg-[#333]/30"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <a href="https://godlocal.ai/static/pwa/smertch.html" target="_blank" rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{ color: "#6C5CE7", border: "1px solid rgba(108,92,231,0.3)", background: "rgba(108,92,231,0.06)" }}
            >
              🐺 WOLF
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hidden md:block btn-outline text-sm px-4 py-2">
              GitHub
            </a>
            {/* Mobile burger */}
            <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
              <div className="space-y-1.5">
                <span className={`block h-0.5 bg-[#E0E0E0]/70 transition-all duration-300 ${open ? "w-6 rotate-45 translate-y-2" : "w-6"}`} />
                <span className={`block h-0.5 bg-[#E0E0E0]/70 transition-all duration-300 ${open ? "opacity-0" : "w-4"}`} />
                <span className={`block h-0.5 bg-[#E0E0E0]/70 transition-all duration-300 ${open ? "w-6 -rotate-45 -translate-y-2" : "w-5"}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden border-t border-[#333]/50 py-4 space-y-1">
            {nav.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm transition-colors ${item.highlight ? "text-[#00FF9D] bg-[#00FF9D]/5" : "text-[#E0E0E0]/70 hover:text-[#E0E0E0]"}`}>
                {item.label}
              </Link>
            ))}
            <a href="https://godlocal.ai/static/pwa/smertch.html" target="_blank" rel="noopener noreferrer"
              className="block px-4 py-3 text-sm text-[#6C5CE7]">🐺 WOLF Terminal</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="block px-4 py-3 text-sm text-[#E0E0E0]/70">GitHub ↗</a>
          </div>
        )}
      </div>
    </header>
  );
}
