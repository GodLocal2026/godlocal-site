import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-12 bg-[#060810] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-xl">{"⚡"}</span>
            <span className="font-black text-lg text-white tracking-tight">God<span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Local</span></span>
          </Link>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <Link href="/oasis" className="hover:text-white transition-colors">Oasis</Link>
            <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
            <a href="https://github.com/GodLocal2026/godlocal" target="_blank" rel="noopener" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://twitter.com/oassisx100" target="_blank" rel="noopener" className="hover:text-white transition-colors">Twitter</a>
          </div>
          <div className="text-gray-600 text-sm">© GodLocal · Open Core</div>
        </div>
      </div>
    </footer>
  );
}
