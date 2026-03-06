'use client';
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#060810]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-xl text-white">
          🐘 <span>slonik52</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <Link href="/#features" className="hover:text-white transition-colors">Фичи</Link>
          <Link href="/#how" className="hover:text-white transition-colors">Как работает</Link>
          <a href="https://twitter.com/oassisx100" target="_blank" rel="noopener" className="hover:text-white transition-colors">Twitter</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="https://pump.fun/create" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-500/30 text-orange-300 text-sm font-semibold hover:bg-orange-500/10 transition-colors">
            🪙 Создать токен
          </a>
          <a href="/static/pwa/smertch.html"
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:opacity-90 transition-opacity">
            Open Terminal →
          </a>
        </div>
      </div>
    </header>
  );
}
