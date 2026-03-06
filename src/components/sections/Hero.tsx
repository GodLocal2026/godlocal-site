'use client';
import { useEffect, useRef } from 'react';

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles: { x: number; y: number; vx: number; vy: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, a: Math.random() });
    }
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(153,102,255,${p.a * 0.5})`; ctx.fill();
      });
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 100) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(153,102,255,${(1 - d / 100) * 0.12})`; ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#060810] pt-16">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Live · Solana Memecoin Terminal
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.05]">
          Trade Solana memecoins{' '}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            smarter.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Real-time scanner · 4-agent AI hedge fund · Native Phantom swap.<br className="hidden md:block" />
          No install. Open in browser, start trading.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <a href="/static/pwa/smertch.html"
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-200">
            <span>🐘</span>
            Open Terminal
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a href="https://pump.fun/create" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 text-orange-300 font-bold text-lg hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200">
            🪙 Создать токен
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm text-gray-500">
          {[{ v: '< 0.5s', l: 'New token latency' }, { v: '4 AI agents', l: 'Hedge fund model' }, { v: 'Top 100', l: 'Market coverage' }, { v: 'Free', l: 'No signup' }].map(s => (
            <div key={s.l} className="text-center">
              <div className="text-white font-bold text-base">{s.v}</div>
              <div>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-16 px-4 pb-16">
        <div className="relative mx-auto w-[260px]">
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-12 bg-purple-500/30 blur-2xl rounded-full" />
          <div className="relative rounded-[40px] border border-white/10 bg-[#0d1117] shadow-2xl shadow-purple-500/10 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
            <div className="p-4 pt-8 space-y-2 min-h-[400px]">
              {[{ sym: 'PEPE2', mc: '$2.4M', ch: '+142%', up: true }, { sym: 'DOGE2', mc: '$890K', ch: '+87%', up: true }, { sym: 'BONK2', mc: '$1.1M', ch: '+63%', up: true }, { sym: 'SHIB2', mc: '$340K', ch: '-12%', up: false }].map(t => (
                <div key={t.sym} className="flex items-center justify-between px-3 py-2.5 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-sm">🐘</div>
                    <div><div className="text-white text-xs font-bold">{t.sym}</div><div className="text-gray-500 text-[10px]">{t.mc}</div></div>
                  </div>
                  <div className={`text-xs font-bold ${t.up ? 'text-green-400' : 'text-red-400'}`}>{t.ch}</div>
                </div>
              ))}
              <div className="flex justify-around pt-3 border-t border-white/5">
                {['СКАН', 'НОВОСТИ', 'РЫНОК', 'AI'].map((tab, i) => (
                  <div key={tab} className={`text-[9px] font-bold ${i === 0 ? 'text-purple-400' : 'text-gray-600'}`}>{tab}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
