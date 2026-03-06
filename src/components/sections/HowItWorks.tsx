'use client';

const steps = [
  {
    n: '01',
    icon: '\u26a1',
    title: 'Install in 1 minute',
    desc: 'git clone \u2192 npm install \u2192 npm run dev. Done. Local AI engine running on your hardware.',
    detail: 'npx godlocal init \u00b7 Node.js 18+'
  },
  {
    n: '02',
    icon: '\ud83e\udde0',
    title: 'Smart Routing',
    desc: '5-tier TieredRouter auto-selects the best backend: WASM \u2192 BitNet \u2192 Taalas (17k tok/s) \u2192 Groq/Cerebras \u2192 AirLLM 70B.',
    detail: 'WASM \u00b7 Micro \u00b7 Fast \u00b7 Full \u00b7 Giant'
  },
  {
    n: '03',
    icon: '\ud83e\udd16',
    title: 'Launch Agent with Soul',
    desc: 'SOUL files, memory graph, emotion map, self-reflection. Agent remembers, feels, and learns — even while you sleep.',
    detail: 'ConsciousnessLoop \u00b7 SparkNet \u00b7 Memory Graph'
  },
  {
    n: '04',
    icon: '\ud83d\udcf1',
    title: 'Works on iPhone',
    desc: 'CoreML + Apple Neural Engine. LFM2 24B @ 40 tok/s, PARO 4B @ 60 tok/s. Full privacy — data never leaves device.',
    detail: 'CoreML \u00b7 ANE \u00b7 On-device inference'
  },
  {
    n: '05',
    icon: '\ud83d\udee0\ufe0f',
    title: 'Deploy & Scale',
    desc: 'Git-native deploy, Docker, PostgreSQL, Redis — all out of the box. PaaS for AI apps with monitoring and logs.',
    detail: 'git push \u00b7 Docker \u00b7 Vercel \u00b7 Self-hosted'
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-[#060810]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">How it works</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            From install to <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">production</span> in 5 minutes
          </h2>
          <p className="text-gray-400 text-lg">Local AI without compromises. One stack — all capabilities.</p>
        </div>
        <div className="relative">
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-green-500/40 via-green-500/20 to-transparent hidden md:block" />
          <div className="space-y-8">
            {steps.map(s => (
              <div key={s.n} className="flex gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center text-xl">{s.icon}</div>
                <div className="flex-1 pt-3 pb-8 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-green-500 text-xs font-mono font-bold">{s.n}</span>
                    <h3 className="text-white font-bold text-lg">{s.title}</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed mb-2">{s.desc}</p>
                  <code className="text-xs text-green-400/70 font-mono">{s.detail}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
