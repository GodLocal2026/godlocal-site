'use client';

const features = [
  {
    icon: '🧠',
    title: 'Память и эмоции',
    desc: 'SQLite граф, рефлексия, эмоциональная карта — агент помнит и чувствует.',
    detail: 'Memory Graph · Emotion Map · SOUL files'
  },
  {
    icon: '⚡',
    title: 'SparkNet',
    desc: 'Самообучающаяся система оценки идей. EMA judge, временные якоря, эволюция мышления.',
    detail: 'EMA Judge · Temporal Anchors · Idea Evolution'
  },
  {
    icon: '🔄',
    title: 'ConsciousnessLoop',
    desc: 'Автономное мышление каждые 5 минут. Агент учится, анализирует и планирует без вашего участия.',
    detail: '5-min cycle · Self-reflection · Auto-learning'
  },
  {
    icon: '🎭',
    title: 'SOUL файлы',
    desc: 'Персонализация через конфиг: цели, характер, стиль общения. Каждый агент уникален.',
    detail: 'Goals · Personality · Communication Style'
  },
  {
    icon: '🤝',
    title: 'Мульти-агенты',
    desc: 'Несколько агентов работают параллельно: анализ рынка, постинг в соцсети, планирование задач.',
    detail: 'Market Analysis · Social · Task Planning'
  },
  {
    icon: '💰',
    title: 'Суверенный AI',
    desc: 'Агент с собственным кошельком, капиталом и правами. Автономные транзакции через Solana.',
    detail: 'Phantom · Jupiter · Solana CLI'
  },
];

export default function Agents() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Автономные агенты</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Агенты с <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">душой</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">Не просто чат-бот. Полноценный AI с памятью, эмоциями, рефлексией и собственным капиталом.</p>
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
