'use client';

const tiers = [
  { name: 'WASM', speed: '~1k tok/s', desc: 'Быстрый старт, малый вес', color: 'from-blue-400 to-cyan-400' },
  { name: 'Micro', speed: 'BitNet 0.4GB', desc: 'Экстремально лёгкие модели', color: 'from-cyan-400 to-teal-400' },
  { name: 'Fast', speed: '17k tok/s', desc: 'Taalas — максимальная скорость', color: 'from-green-400 to-emerald-400' },
  { name: 'Full', speed: 'Groq/Cerebras', desc: 'Облачные ускорители', color: 'from-yellow-400 to-orange-400' },
  { name: 'Giant', speed: 'AirLLM 70B', desc: 'Гигантские модели', color: 'from-orange-400 to-red-400' },
];

export default function TieredRouter() {
  return (
    <section className="py-24 bg-[#060810]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Архитектура</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Умная маршрутизация: <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">5 уровней</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">TieredRouter автоматически выбирает оптимальный бэкенд в зависимости от задачи, модели и устройства.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiers.map((t, i) => (
            <div key={t.name} className="group relative bg-[#0d1017] border border-white/[0.06] rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className="text-xs text-gray-500 font-mono mb-3">TIER {i + 1}</div>
              <h3 className={`text-2xl font-black mb-2 bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>{t.name}</h3>
              <div className="text-sm text-green-400 font-mono mb-3">{t.speed}</div>
              <p className="text-gray-400 text-sm">{t.desc}</p>
              {i < tiers.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 text-gray-600 z-10">→</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <code className="text-xs text-gray-500 font-mono">WASM → Micro → Fast → Full → Giant · auto-fallback · < 50ms routing</code>
        </div>
      </div>
    </section>
  );
}
