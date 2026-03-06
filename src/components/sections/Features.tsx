'use client';

const features = [
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: '17,000 tokens/sec via smart 5-tier routing. Run large models on a laptop.',
    tag: 'Performance',
    tc: 'text-green-400 bg-green-400/10',
  },
  {
    icon: '🤖',
    title: 'Autonomous Agents',
    desc: 'SOUL files, emotion maps, memory graphs. Your AI learns while you sleep.',
    tag: 'AI',
    tc: 'text-purple-400 bg-purple-400/10',
  },
  {
    icon: '🔒',
    title: '100% Private',
    desc: 'All inference runs locally. Your data never leaves your machine.',
    tag: 'Privacy',
    tc: 'text-blue-400 bg-blue-400/10',
  },
  {
    icon: '📱',
    title: 'iPhone Ready',
    desc: 'CoreML + ANE. LFM2 24B @ 40 tok/s. PARO 4B @ 60 tok/s.',
    tag: 'Mobile',
    tc: 'text-orange-400 bg-orange-400/10',
  },
  {
    icon: '🛠️',
    title: 'DevOps Built-in',
    desc: 'Git-native deploy, Docker, env management, PostgreSQL/Redis.',
    tag: 'Infra',
    tc: 'text-pink-400 bg-pink-400/10',
  },
  {
    icon: '💱',
    title: 'DeFi Terminal',
    desc: 'Solana CLI, Jupiter integration, circuit breaker, AI market analysis.',
    tag: 'Crypto',
    tc: 'text-red-400 bg-red-400/10',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#07090f] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">
            Core Features
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Local inference, autonomous agents, PaaS, and crypto tools in one platform.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-white font-bold text-lg leading-tight">
                  {f.title}
                </h3>
                <span
                  className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${f.tc}`}
                >
                  {f.tag}
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
