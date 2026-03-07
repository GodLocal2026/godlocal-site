'use client';
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#060810]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-xl">⚡</span>
          <span className="font-black text-lg text-white tracking-tight">God<span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Local</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/#how" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/ai" className="hover:text-white transition-colors">GodLocal AI</Link>
            <Link href="/codethinker" className="hover:text-white transition-colors">CodeThinker</Link>
          <Link href="/nebudda" className="hover:text-white transition-colors">NEBUDDA</Link>
          <Link href="/#projects" className="hover:text-white transition-colors">Projects</Link>
          <a href="https://twitter.com/oassisx100" target="_blank" rel="noopener" className="hover:text-white transition-colors">Twitter</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="https://github.com/GodLocal2026/godlocal" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            GitHub
          </a>
          <Link href="/ai"
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/15">
            GodLocal AI →
          </Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-gray-400 hover:text-white p-1">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" /> : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#060810]/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <Link href="/#features" onClick={() => setOpen(false)} className="block text-gray-300 hover:text-white py-2">Features</Link>
          <Link href="/#how" onClick={() => setOpen(false)} className="block text-gray-300 hover:text-white py-2">How it works</Link>
          <Link href="/ai" onClick={() => setOpen(false)} className="block text-gray-300 hover:text-white py-2">GodLocal AI</Link>
            <Link href="/codethinker" onClick={() => setOpen(false)} className="block text-gray-300 hover:text-white py-2">CodeThinker</Link>
          <Link href="/nebudda" onClick={() => setOpen(false)} className="block text-gray-300 hover:text-white py-2">NEBUDDA</Link>
          <Link href="/#projects" onClick={() => setOpen(false)} className="block text-gray-300 hover:text-white py-2">Projects</Link>
          <a href="https://github.com/GodLocal2026/godlocal" target="_blank" rel="noopener" className="block text-gray-300 hover:text-white py-2">GitHub</a>
        </div>
      )}
    </header>
  );
}
