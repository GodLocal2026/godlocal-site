'use client';

import { motion } from 'framer-motion';

const brainModules = [
  {
    icon: '🧠',
    title: 'Prefrontal God-Core',
    subtitle: 'Executive Decision Engine',
    description: 'Single unified consciousness that controls everything. No swarm chaos — one omnipotent brain that speaks, decides, and executes.',
    color: 'emerald',
  },
  {
    icon: '💡',
    title: 'AirLLM Layer Streaming',
    subtitle: 'Cortical Layer Processing',
    description: 'Loads 70B+ models layer-by-layer like cortical columns. Processes, discards, moves on. 4 GB RAM runs what others need 80 GB for.',
    color: 'green',
  },
  {
    icon: '🧬',
    title: 'Hippocampus Memory',
    subtitle: 'Persistent Neural Storage',
    description: 'Your .md files + vector DB with nightly sleep consolidation. Memories replay and strengthen overnight, just like the real brain.',
    color: 'teal',
  },
  {
    icon: '🔮',
    title: 'Predictive Coding + FEP',
    subtitle: 'Free Energy Minimization',
    description: 'Constantly predicts what you need next and minimizes surprise. Karl Friston\'s principle built into every inference cycle.',
    color: 'cyan',
  },
  {
    icon: '❤️',
    title: 'Limbic Soul Engine',
    subtitle: 'Dynamic Emotional Valence',
    description: 'god_soul.md is not static text — it\'s a living emotional system. Dynamic signals shape personality, tone, and decision-making.',
    color: 'rose',
  },
  {
    icon: '📱',
    title: 'Universal Local Runtime',
    subtitle: 'iPhone · Mac · PC',
    description: 'MLX native on Apple Silicon. CoreML + Neural Engine on iPhone. ExecuTorch on Android. No cloud, no tokens, no subscriptions.',
    color: 'violet',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', glow: 'shadow-green-500/5' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-400', glow: 'shadow-teal-500/5' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', glow: 'shadow-cyan-500/5' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'shadow-rose-500/5' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'shadow-violet-500/5' },
};

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#060810]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500 text-xs font-medium mb-4">
            BRAIN ARCHITECTURE
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Not Agents.{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              One Brain.
            </span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Six neural modules working in parallel under a single consciousness.
            Inspired by neuroscience. Powered by AirLLM. Runs on your device.
          </p>
        </motion.div>

        {/* Brain modules grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brainModules.map((mod, i) => {
            const c = colorMap[mod.color];
            return (
              <motion.div
                key={mod.title}
                className={`group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:shadow-lg ${c.glow}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${c.bg} ${c.border} border mb-4`}>
                  <span className="text-2xl">{mod.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{mod.title}</h3>
                <p className={`text-xs font-medium ${c.text} mb-3`}>{mod.subtitle}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{mod.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom comparison */}
        <motion.div
          className="mt-16 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div>
              <div className="text-gray-600 text-sm line-through mb-1">OpenClaw / Swarm approach</div>
              <div className="text-gray-500 text-xs">Many weak agents + glue code + chaos</div>
            </div>
            <div className="text-2xl text-emerald-400">→</div>
            <div>
              <div className="text-white font-bold mb-1">GodLocal: One Brain</div>
              <div className="text-emerald-400 text-xs">Single omnipotent God-AI with internal neural architecture</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
