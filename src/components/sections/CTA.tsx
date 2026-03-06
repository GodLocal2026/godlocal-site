'use client';

export default function CTA() {
  return (
    <section className="py-24 bg-[#07090f] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/10 blur-[80px] rounded-full" />
      </div>
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <div className="text-6xl mb-6">🐘</div>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">Начни торговать прямо сейчас</h2>
        <p className="text-gray-400 text-xl mb-10">
          Открой терминал — работает прямо в браузере.<br />
          Phantom подключается за один tap.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/static/pwa/smertch.html"
            className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-200">
            <span>🐘</span>
            Open slonik52 Terminal
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a href="https://pump.fun/create" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 text-orange-300 font-bold text-lg hover:bg-orange-500/10 transition-all duration-200">
            🪙 Создать свой токен
          </a>
        </div>
        <p className="text-gray-600 text-sm mt-8">Free · No signup · Works on iPhone · Powered by Jupiter + Phantom</p>
      </div>
    </section>
  );
}
