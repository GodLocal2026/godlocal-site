'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GITHUB_URL } from '@/lib/utils';
const nav = [{ href:'/product', label:'Product' },{ href:'/community', label:'Community' },{ href:'/about', label:'About' }];
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled?'bg-background/90 backdrop-blur-md border-b border-border/50':'bg-transparent'}`}>
      <div className="container">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="text-primary font-mono font-bold text-sm">G</span>
            </div>
            <span className="font-bold text-lg tracking-tight">God<span className="text-primary">Local</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(item => (<Link key={item.href} href={item.href} className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 rounded-lg transition-all">{item.label}</Link>))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-foreground/70 hover:text-foreground transition-all">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-4 py-2">Get Started</a>
          </div>
          <button className="md:hidden p-2 text-foreground/70" onClick={() => setOpen(!open)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open?<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
            </svg>
          </button>
        </div>
        {open && (
          <div className="md:hidden py-4 border-t border-border/50">
            {nav.map(item => (<Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block px-4 py-3 text-foreground/70 hover:text-foreground rounded-lg">{item.label}</Link>))}
            <div className="mt-4 px-4"><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm w-full text-center block">Get Started</a></div>
          </div>
        )}
      </div>
    </header>
  );
}
