"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GITHUB_URL } from "@/lib/utils";

const nav = [
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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center">
              <span className="text-[#00FF9D] font-mono font-bold text-sm">G</span>
            </div>
            <span className="font-bold text-lg">God<span className="text-[#00FF9D]">Local</span></span>
            {/* Live indicator */}
            {alive !== null && (
              <span className="flex items-center gap-1 ml-1">
                <span
                  style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: alive ? "#00FF9D" : "#888", boxShadow: alive ? "0 0 5px rgba(0,255,157,0.7)" : undefined }}
                />
                <span style={{ fontSize: 10, fontFamily: "monospace", color: alive ? "rgba(0,255,157,0.6)" : "rgba(255,255,255,0.25)" }}>
                  {alive ? "live" : ".."}
                </span>
              </span>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(item => (
              <Link key={item.href} href={item.href} className="px-4 py-2 text-sm text-[#E0E0E0]/70 hover:text-[#E0E0E0] hover:bg-white/5 rounded-lg transition-all">{item.label}</Link>
            ))}
            {/* Chat link */}
            <Link href="/chat" className="px-4 py-2 text-sm text-[#00FF9D]/80 hover:text-[#00FF9D] hover:bg-[#00FF9D]/5 rounded-lg transition-all font-mono">Chat ⚡</Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-4 py-2">GitHub ↗</a>
          </div>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <div className="md:hidden py-4 border-t border-[#333]/50">
            {nav.map(item => (
              <Link key={item.href} href={item.href} className="block px-4 py-3 text-[#E0E0E0]/70 hover:text-[#E0E0E0]" onClick={() => setOpen(false)}>{item.label}</Link>
            ))}
            <Link href="/chat" className="block px-4 py-3 text-[#00FF9D]/80 font-mono" onClick={() => setOpen(false)}>Chat ⚡</Link>
          </div>
        )}
      </div>
    </header>
  );
}
