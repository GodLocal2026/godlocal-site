import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-12 bg-[#060810] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-black text-xl">🐘 slonik52</div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="/static/pwa/smertch.html" className="hover:text-white transition-colors">Terminal</a>
            <a href="https://pump.fun" target="_blank" rel="noopener" className="hover:text-white transition-colors">pump.fun</a>
            <a href="https://jup.ag" target="_blank" rel="noopener" className="hover:text-white transition-colors">Jupiter</a>
            <a href="https://twitter.com/oassisx100" target="_blank" rel="noopener" className="hover:text-white transition-colors">@oassisx100</a>
          </div>
          <div className="text-gray-600 text-sm">© 2026 slonik52 · Built on Solana</div>
        </div>
      </div>
    </footer>
  );
}
