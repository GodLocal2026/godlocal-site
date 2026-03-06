'use client';

const tiers = [
  { name: 'WASM', speed: '~1k tok/s', desc: '\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u0441\u0442\u0430\u0440\u0442, \u043c\u0430\u043b\u044b\u0439 \u0432\u0435\u0441', color: 'from-blue-400 to-cyan-400' },
  { name: 'Micro', speed: 'BitNet 0.4GB', desc: '\u042d\u043a\u0441\u0442\u0440\u0435\u043c\u0430\u043b\u044c\u043d\u043e \u043b\u0451\u0433\u043a\u0438\u0435 \u043c\u043e\u0434\u0435\u043b\u0438', color: 'from-cyan-400 to-teal-400' },
  { name: 'Fast', speed: '17k tok/s', desc: 'Taalas \u2014 \u043c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u0430\u044f \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u044c', color: 'from-green-400 to-emerald-400' },
  { name: 'Full', speed: 'Groq/Cerebras', desc: '\u041e\u0431\u043b\u0430\u0447\u043d\u044b\u0435 \u0443\u0441\u043a\u043e\u0440\u0438\u0442\u0435\u043b\u0438', color: 'from-yellow-400 to-orange-400' },
  { name: 'Giant', speed: 'AirLLM 70B', desc: '\u0413\u0438\u0433\u0430\u043d\u0442\u0441\u043a\u0438\u0435 \u043c\u043e\u0434\u0435\u043b\u0438', color: 'from-orange-400 to-red-400' },
];

export default function TieredRouter() {
  return (
    <section className="py-24 bg-[#060810]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Architecture</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Smart Routing: <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">5 Tiers</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">TieredRouter automatically selects the optimal backend based on task, model, and device.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiers.map((t, i) => (
            <div key={t.name} className="group relative bg-[#0d1017] border border-white/[0.06] rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className="text-xs text-gray-500 font-mono mb-3">TIER {i + 1}</div>
              <h3 className={`text-2xl font-black mb-2 bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>{t.name}</h3>
              <div className="text-sm text-green-400 font-mono mb-3">{t.speed}</div>
              <p className="text-gray-400 text-sm">{t.desc}</p>
              {i < tiers.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 text-gray-600 z-10">\u2192</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <code className="text-xs text-gray-500 font-mono">WASM \u2192 Micro \u2192 Fast \u2192 Full \u2192 Giant \u00b7 auto-fallback \u00b7 &lt; 50ms routing</code>
        </div>
      </div>
    </section>
  );
}
