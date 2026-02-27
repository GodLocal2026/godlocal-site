import Link from 'next/link';
import { GITHUB_URL, TWITTER_URL, TWITTER_RU_URL, TWITTER_DEV_URL } from '@/lib/utils';
export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card-bg/50">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center"><span className="text-primary font-mono font-bold text-sm">G</span></div>
              <span className="font-bold text-lg">God<span className="text-primary">Local</span></span>
            </Link>
            <p className="text-sm text-foreground/50 leading-relaxed">Your AI. Your machine.<br/>Open source. Privacy first.</p>
            <div className="mt-6 flex gap-3">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/40 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/40 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">{[['Local AI','/product'],['Agents','/product'],['PaaS','/product'],['xZero','/product']].map(([l,h])=>(<li key={l}><Link href={h} className="text-sm text-foreground/50 hover:text-primary transition-colors">{l}</Link></li>))}</ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">Developers</h3>
            <ul className="space-y-3">
              <li><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground/50 hover:text-primary transition-colors">GitHub</a></li>
              <li><Link href="/about" className="text-sm text-foreground/50 hover:text-primary transition-colors">About</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">Community</h3>
            <ul className="space-y-3">
              {[[TWITTER_URL,'@GodLocal'],[TWITTER_RU_URL,'@GodLocalRU'],[TWITTER_DEV_URL,'@GodLocalDev']].map(([h,l])=>(<li key={l}><a href={h} target="_blank" rel="noopener noreferrer" className="text-sm text-foreground/50 hover:text-primary transition-colors">{l}</a></li>))}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-foreground/30">© 2026 GodLocal. MIT License.</p>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse"/><span className="text-xs text-foreground/30 font-mono">v2.0 // godlocal.ai</span></div>
        </div>
      </div>
    </footer>
  );
}
