import Link from "next/link";
import { GITHUB_URL, TWITTER_URL } from "@/lib/utils";
export default function Footer() {
  return (
    <footer className="border-t border-[#333]/50 bg-[#111316]/50">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center">
                <span className="text-[#00FF9D] font-mono font-bold text-sm">G</span>
              </div>
              <span className="font-bold text-lg">God<span className="text-[#00FF9D]">Local</span></span>
            </Link>
            <p className="text-sm text-[#E0E0E0]/40">Your AI. Your machine.</p>
            <div className="mt-4 flex gap-3">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-[#E0E0E0]/30 hover:text-[#00FF9D] transition-colors text-sm">GitHub</a>
              <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-[#E0E0E0]/30 hover:text-[#00FF9D] transition-colors text-sm">Twitter</a>
            </div>
          </div>
          <div className="flex gap-12">
            <div>
              <h3 className="text-xs font-semibold text-[#E0E0E0]/50 uppercase tracking-wider mb-3">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/product" className="text-sm text-[#E0E0E0]/40 hover:text-[#00FF9D] transition-colors">Features</Link></li>
                <li><Link href="/about" className="text-sm text-[#E0E0E0]/40 hover:text-[#00FF9D] transition-colors">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[#E0E0E0]/50 uppercase tracking-wider mb-3">Community</h3>
              <ul className="space-y-2">
                <li><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-[#E0E0E0]/40 hover:text-[#00FF9D] transition-colors">GitHub</a></li>
                <li><Link href="/community" className="text-sm text-[#E0E0E0]/40 hover:text-[#00FF9D] transition-colors">Socials</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[#333]/30 flex justify-between items-center">
          <p className="text-xs text-[#E0E0E0]/20">© 2026 GodLocal. MIT License.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
            <span className="text-xs text-[#E0E0E0]/20 font-mono">godlocal.ai</span>
          </div>
        </div>
      </div>
    </footer>
  );
}