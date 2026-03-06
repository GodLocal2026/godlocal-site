'use client';

const features = [
  { icon: '⚡', title: 'WebSocket Live Feed', desc: 'Новые токены за 0.3–1.5 сек через pumpportal.fun. Быстрее любого обновления страницы.', tag: 'Real-time', tc: 'text-green-400 bg-green-400/10' },
  { icon: '🧠', title: '4-Agent AI Hedge Fund', desc: 'Rug Detective + Momentum + Value + Sentiment → Portfolio Manager. STRONG BUY / AVOID + confidence %.', tag: 'AI', tc: 'text-purple-400 bg-purple-400/10' },
  { icon: '👻', title: 'Native Phantom Swap', desc: 'Jupiter v6 quote → sign → send прямо из терминала. Никаких редиректов. 0.3% slippage по умолчанию.', tag: 'Jupiter v6', tc: 'text-blue-400 bg-blue-400/10' },
  { icon: '📊', title: 'Top 100 by Market Cap', desc: 'Весь крипторынок через CoinGecko. BTC, ETH, SOL и ещё 97 монет — цена, 1H + 24H изменение.', tag: 'Market', tc: 'text-orange-400 bg-orange-400/10' },
  { icon: '📰', title: 'Новости: CMC · CG · Pump', desc: 'Три вкладки: CoinMarketCap/Decrypt, CoinGecko trending, pump.fun King of the Hill.', tag: 'News', tc: 'text-pink-400 bg-pink-400/10' },
  { icon: '🛡️', title: 'Rug Score на карточке', desc: 'Автоматический rug-score 0–100% — ликвидность, возраст пары, buy/sell ratio за 1H.', tag: 'Safety', tc: 'text-red-400 bg-red-400/10' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#07090f] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Что внутри</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Всё что нужно дегену.</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Без регистрации, без установки — открыл браузер на iPhone, подключил Phantom, торгуешь.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f => (
            <div key={f.title} className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-white font-bold text-lg leading-tight">{f.title}</h3>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${f.tc}`}>{f.tag}</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
