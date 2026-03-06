'use client';

const steps = [
  {
    n: '01',
    icon: '⚡',
    title: 'Установи за 1 минуту',
    desc: 'git clone → npm install → npm run dev. Всё. Локальный AI-движок запущен на твоём железе.',
    detail: 'npx godlocal init · Node.js 18+'
  },
  {
    n: '02',
    icon: '🧠',
    title: 'Умная маршрутизация',
    desc: '5-уровневый TieredRouter автоматически выбирает лучший бэкенд: WASM → BitNet → Taalas (17k tok/s) → Groq/Cerebras → AirLLM 70B.',
    detail: 'WASM · Micro · Fast · Full · Giant'
  },
  {
    n: '03',
    icon: '🤖',
    title: 'Запусти агента с душой',
    desc: 'SOUL-файлы, граф памяти, эмоциональная карта, саморефлексия. Агент помнит, чувствует и учится — даже пока ты спишь.',
    detail: 'ConsciousnessLoop · SparkNet · Memory Graph'
  },
  {
    n: '04',
    icon: '📱',
    title: 'Работает на iPhone',
    desc: 'CoreML + Apple Neural Engine. LFM2 24B @ 40 tok/s, PARO 4B @ 60 tok/s. Полная приватность — данные не покидают устройство.',
    detail: 'CoreML · ANE · On-device inference'
  },
  {
    n: '05',
    icon: '🛠️',
    title: 'Деплой и масштабируй',
    desc: 'Git-native деплой, Docker, PostgreSQL, Redis — всё из коробки. PaaS для AI-приложений с мониторингом и логами.',
    detail: 'git push · Docker · Vercel · Self-hosted'
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-[#060810]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Как это работает</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            От установки до <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">продакшена</span> за 5 минут
          </h2>
          <p className="text-gray-400 text-lg">Локальный AI без компромиссов. Один стек — все возможности.</p>
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
