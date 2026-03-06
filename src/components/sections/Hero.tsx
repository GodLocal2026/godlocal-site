'use client';
import { useEffect, useRef, useState } from 'react';

const TERMINAL_LINES = [
  { type: 'cmd', text: '$ npx godlocal init' },
  { type: 'out', text: '✓ GodLocal v2.0 initialized' },
  { type: 'cmd', text: '$ godlocal start --tier=auto' },
  { type: 'out', text: '⚡ TieredRouter ready // 5 tiers active' },
  { type: 'out', text: '🧠 ConsciousnessLoop started (5-min cycle)' },
  { type: 'out', text: '🟢 Oasis running on localhost:3000' },
];

const STATS = [
  { value: '17k', unit: 'tok/s', label: 'Taalas speed' },
  { value: '5', unit: 'tiers', label: 'Smart routing' },
  { value: '24B', unit: 'params', label: 'On iPhone' },
  { value: '60', unit: 'tok/s', label: 'Mobile AI' },
];

function useTypedLines() {
  const [lines, setLines] = useState<{ type: string; text: string; done: boolean }[]>([]);
  useEffect(() => {
    let i = 0;
    let charIdx = 0;
    let raf: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (i >= TERMINAL_LINES.length) return;
      const src = TERMINAL_LINES[i];
      if (charIdx === 0) {
        setLines(prev => [...prev, { type: src.type, text: '', done: false }]);
      }
      charIdx++;
      setLines(prev => {
        const copy = [...prev];
        copy[copy.length - 1] = { type: src.type, text: src.text.slice(0, charIdx), done: charIdx >= src.text.length };
        return copy;
      });
      if (charIdx >= src.text.length) {
        i++;
        charIdx = 0;
        raf = setTimeout(tick, src.type === 'cmd' ? 400 : 200);
      } else {
        raf = setTimeout(tick, src.type === 'cmd' ? 30 : 12);
      }
    };
    raf = setTimeout(tick, 800);
    return () => clearTimeout(raf);
  }, []);
  return lines;
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const termLines = useTypedLines();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth * 1.5; canvas.height = canvas.offsetHeight * 1.5; ctx.scale(1.5, 1.5); };
    resize();
    const particles: { x: number; y: number; vx: number; vy: number; a: number; r: number }[] = [];
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * W(), y: Math.random() * H(), vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, a: 0.2 + Math.random() * 0.6, r: 1 + Math.random() * 1.5 });
    }
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W(); if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H(); if (p.y > H()) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,157,${p.a * 0.3})`; ctx.fill();
      });
      particles.forEach((p, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,255,157,${(1 - d / 120) * 0.06})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#060810] pt-20 pb-12">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />

      {/* Glow orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-green-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-[100px] pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,157,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,157,0.015)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/5 border border-green-500/15 text-green-400/80 text-sm font-medium mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Open Source · v2.0 · 5 Products Live
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white mb-6 leading-[1.02]">
          Your AI.{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              Your machine.
            </span>
            <span className="absolute -inset-x-4 -inset-y-2 bg-green-400/5 blur-2xl rounded-3xl pointer-events-none" />
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          The fastest local AI inference platform with autonomous agents.
          <br className="hidden md:block" />
          Open source. Privacy first. Runs even on iPhone.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="/oasis"
            className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-lg shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02] transition-all duration-200">
            🧠 Open Oasis
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a href="https://github.com/GodLocal2026/godlocal" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white font-bold text-lg hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 backdrop-blur-sm">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            View on GitHub
          </a>
        </div>

        {/* Terminal */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-[#0a0d12] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-xs text-gray-500 font-mono">terminal</span>
            </div>
            <div className="p-4 font-mono text-sm space-y-1 min-h-[180px]">
              {termLines.map((l, i) => (
                <div key={i} className={l.type === 'cmd' ? 'text-white' : 'text-green-400/70'}>
                  {l.text}
                  {!l.done && <span className="inline-block w-2 h-4 bg-green-400 ml-0.5 animate-pulse align-middle" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {STATS.map(s => (
            <div key={s.label} className="px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm text-center">
              <div className="text-white font-black text-xl md:text-2xl">
                {s.value}<span className="text-green-400/80 text-sm font-mono ml-1">{s.unit}</span>
              </div>
              <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
