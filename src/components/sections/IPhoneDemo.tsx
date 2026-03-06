'use client';

const specs = [
  { model: 'LFM2 24B', speed: '40 tok/s', tech: 'CoreML + ANE' },
  { model: 'PARO 4B', speed: '60 tok/s', tech: 'CoreML + ANE' },
  { model: 'BitNet 0.4GB', speed: '80 tok/s', tech: 'WASM fallback' },
];

export default function IPhoneDemo() {
  return (
    <section className="py-24 bg-[#060810]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm mb-5">Mobile AI</div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              AI in your pocket. <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">No cloud.</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8">Full AI inference on iPhone. Your data never leaves the device.</p>
            <div className="space-y-4 mb-8">
              {specs.map(s => (
                <div key={s.model} className="flex items-center justify-between bg-[#0d1017] border border-white/[0.06] rounded-xl p-4">
                  <div>
                    <span className="text-white font-bold">{s.model}</span>
                    <span className="text-gray-500 text-sm ml-3">{s.tech}</span>
                  </div>
                  <div className="text-green-400 font-mono font-bold">{s.speed}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm border border-green-500/20">{"\u2705"} Full Privacy</span>
              <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm border border-green-500/20">{"\u2705"} Offline Mode</span>
              <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm border border-green-500/20">{"\u2705"} PWA</span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative w-[280px] h-[560px] bg-[#0d1017] rounded-[3rem] border-2 border-white/10 p-3 shadow-2xl shadow-green-500/5">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full" />
              <div className="w-full h-full bg-[#0A0C0F] rounded-[2.4rem] flex flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-4">{"\ud83e\udde0"}</div>
                <div className="text-white font-bold text-lg mb-1">GodLocal</div>
                <div className="text-gray-400 text-sm mb-6">On-device AI</div>
                <div className="w-full bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <div className="text-green-400 text-2xl font-mono font-black">60 tok/s</div>
                  <div className="text-gray-400 text-xs mt-1">PARO 4B {"\u00b7"} iPhone 15 Pro</div>
                </div>
                <div className="mt-4 text-xs text-gray-500">CoreML + Apple Neural Engine</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
