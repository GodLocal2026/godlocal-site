'use client';

export default function CTA() {
  return (
    <section className="py-24 bg-[#07090f] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/10 blur-[80px] rounded-full" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-mono mb-6">
          Early Access · Open Core
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
          The platform is live now.
        </h2>
        <p className="text-gray-400 text-xl mb-10">
          Try Oasis, explore WOLF, fork the repo —<br />
          or reach out if you want to build with us.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/oasis"
            className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-200"
          >
            🧠 Open Oasis
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
          <a
            href="https://github.com/GodLocal2026/godlocal"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-gray-300 font-bold text-lg hover:bg-white/10 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            Fork on GitHub
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <span className="text-xs text-gray-600 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
            🟢 Community Edition — Free Forever
          </span>
          <span className="text-xs text-gray-600 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
            🟡 Pro — Advanced Features
          </span>
          <span className="text-xs text-gray-600 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
            No Vendor Lock-in
          </span>
          <span className="text-xs text-gray-600 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
            Self-Hostable
          </span>
        </div>
      </div>
    </section>
  );
}
