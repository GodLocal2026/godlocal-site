'use client';

const steps = [
  { n: '01', icon: '🌐', title: 'Открой терминал', desc: 'Перейди по ссылке — работает в Safari без установки. PWA, добавь на главный экран.', detail: 'godlocal.ai → Open Terminal' },
  { n: '02', icon: '👻', title: 'Подключи Phantom', desc: 'Tap КОШЕЛЁК → Connect Phantom. Один tap, auto-reconnect при следующем открытии.', detail: 'Вкладка КОШЕЛЁК в таб-баре' },
  { n: '03', icon: '🔍', title: 'Скануй токены', desc: 'Вкладка СКАН — новые токены в реальном времени через WebSocket. Mcap, liq, rug-score.', detail: 'pumpportal.fun WS · < 0.5s latency' },
  { n: '04', icon: '🧠', title: 'AI анализ', desc: 'Tap на токен → action sheet → "AI анализ". 4 агента: вердикт за 3–5 секунд.', detail: 'STRONG BUY · BUY · WATCH · AVOID' },
  { n: '05', icon: '⚡', title: 'Торгуй нативно', desc: 'Введи SOL, выбери slippage → "Купить через Phantom". Jupiter v6 строит tx, Phantom подписывает.', detail: 'signAndSendTransaction · Solscan' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-[#060810]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Как это работает</div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">От нуля до свапа за 2 минуты</h2>
          <p className="text-gray-400 text-lg">Интуитивно понятно с первого tap.</p>
        </div>
        <div className="relative">
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/40 via-purple-500/20 to-transparent hidden md:block" />
          <div className="space-y-8">
            {steps.map(s => (
              <div key={s.n} className="flex gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-full border border-purple-500/30 bg-purple-500/10 flex items-center justify-center text-xl">{s.icon}</div>
                <div className="flex-1 pt-3 pb-8 border-b border-white/[0.05] last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-purple-500 text-xs font-mono font-bold">{s.n}</span>
                    <h3 className="text-white font-bold text-lg">{s.title}</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed mb-2">{s.desc}</p>
                  <code className="text-xs text-purple-400/70 font-mono">{s.detail}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
