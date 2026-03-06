'use client';

const features = [
  {
    icon: '\ud83e\udde0',
    title: '\u041f\u0430\u043c\u044f\u0442\u044c \u0438 \u044d\u043c\u043e\u0446\u0438\u0438',
    desc: 'SQLite \u0433\u0440\u0430\u0444, \u0440\u0435\u0444\u043b\u0435\u043a\u0441\u0438\u044f, \u044d\u043c\u043e\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u0430 \u2014 \u0430\u0433\u0435\u043d\u0442 \u043f\u043e\u043c\u043d\u0438\u0442 \u0438 \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0442.',
    detail: 'Memory Graph \u00b7 Emotion Map \u00b7 SOUL files'
  },
  {
    icon: '\u26a1',
    title: 'SparkNet',
    desc: '\u0421\u0430\u043c\u043e\u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0430\u044f\u0441\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u043e\u0446\u0435\u043d\u043a\u0438 \u0438\u0434\u0435\u0439. EMA judge, \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u044f\u043a\u043e\u0440\u044f, \u044d\u0432\u043e\u043b\u044e\u0446\u0438\u044f \u043c\u044b\u0448\u043b\u0435\u043d\u0438\u044f.',
    detail: 'EMA Judge \u00b7 Temporal Anchors \u00b7 Idea Evolution'
  },
  {
    icon: '\ud83d\udd04',
    title: 'ConsciousnessLoop',
    desc: '\u0410\u0432\u0442\u043e\u043d\u043e\u043c\u043d\u043e\u0435 \u043c\u044b\u0448\u043b\u0435\u043d\u0438\u0435 \u043a\u0430\u0436\u0434\u044b\u0435 5 \u043c\u0438\u043d\u0443\u0442. \u0410\u0433\u0435\u043d\u0442 \u0443\u0447\u0438\u0442\u0441\u044f, \u0430\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u0435\u0442 \u0438 \u043f\u043b\u0430\u043d\u0438\u0440\u0443\u0435\u0442 \u0431\u0435\u0437 \u0432\u0430\u0448\u0435\u0433\u043e \u0443\u0447\u0430\u0441\u0442\u0438\u044f.',
    detail: '5-min cycle \u00b7 Self-reflection \u00b7 Auto-learning'
  },
  {
    icon: '\ud83c\udfad',
    title: 'SOUL files',
    desc: '\u041f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f: \u0446\u0435\u043b\u0438, \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440, \u0441\u0442\u0438\u043b\u044c \u043e\u0431\u0449\u0435\u043d\u0438\u044f. \u041a\u0430\u0436\u0434\u044b\u0439 \u0430\u0433\u0435\u043d\u0442 \u0443\u043d\u0438\u043a\u0430\u043b\u0435\u043d.',
    detail: 'Goals \u00b7 Personality \u00b7 Communication Style'
  },
  {
    icon: '\ud83e\udd1d',
    title: 'Multi-Agents',
    desc: '\u041d\u0435\u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0430\u0433\u0435\u043d\u0442\u043e\u0432 \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0442 \u043f\u0430\u0440\u0430\u043b\u043b\u0435\u043b\u044c\u043d\u043e: \u0430\u043d\u0430\u043b\u0438\u0437 \u0440\u044b\u043d\u043a\u0430, \u0441\u043e\u0446\u0441\u0435\u0442\u0438, \u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435.',
    detail: 'Market Analysis \u00b7 Social \u00b7 Task Planning'
  },
  {
    icon: '\ud83d\udcb0',
    title: 'Sovereign AI',
    desc: '\u0410\u0433\u0435\u043d\u0442 \u0441 \u0441\u043e\u0431\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u043c \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u043e\u043c, \u043a\u0430\u043f\u0438\u0442\u0430\u043b\u043e\u043c \u0438 \u043f\u0440\u0430\u0432\u0430\u043c\u0438. \u0410\u0432\u0442\u043e\u043d\u043e\u043c\u043d\u044b\u0435 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438 \u0447\u0435\u0440\u0435\u0437 Solana.',
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
