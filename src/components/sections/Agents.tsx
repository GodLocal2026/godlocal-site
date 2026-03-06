'use client';

const features = [
  {
    icon: '\ud83e\udde0',
    title: 'Memory & Emotions',
    desc: 'SQLite graph, reflection, emotion map — agent remembers and feels.',
    detail: 'Memory Graph \u00b7 Emotion Map \u00b7 SOUL files'
  },
  {
    icon: '\u26a1',
    title: 'SparkNet',
    desc: 'Self-learning idea evaluation system. EMA judge, temporal anchors, thought evolution.',
    detail: 'EMA Judge \u00b7 Temporal Anchors \u00b7 Idea Evolution'
  },
  {
    icon: '\ud83d\udd04',
    title: 'ConsciousnessLoop',
    desc: 'Autonomous thinking every 5 minutes. Agent learns, analyzes and plans without you.',
    detail: '5-min cycle \u00b7 Self-reflection \u00b7 Auto-learning'
  },
  {
    icon: '\ud83c\udfad',
    title: 'SOUL Files',
    desc: 'Personalization via config: goals, character, communication style. Every agent is unique.',
    detail: 'Goals \u00b7 Personality \u00b7 Communication Style'
  },
  {
    icon: '\ud83e\udd1d',
    title: 'Multi-Agents',
    desc: 'Multiple agents work in parallel: market analysis, social posting, task planning.',
    detail: 'Market Analysis \u00b7 Social \u00b7 Task Planning'
  },
  {
    icon: '\ud83d\udcb0',
    title: 'Sovereign AI',
    desc: 'Agent with its own wallet, capital and rights. Autonomous transactions via Solana.',
    detail: 'Phantom \u00b7 Jupiter \u00b7 Solana CLI'
  },
];

export default function Agents() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Autonomous Agents</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Agents with <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Soul</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">Not just a chatbot. Full AI with memory, emotions, reflection, and its own capital.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-[#0d1017] border border-white/[0.06] rounded-2xl p-6 hover:border-green-500/20 transition-all duration-300">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">{f.desc}</p>
              <code className="text-xs text-green-400/60 font-mono">{f.detail}</code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
