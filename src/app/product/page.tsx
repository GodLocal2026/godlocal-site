"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GITHUB_URL } from "@/lib/utils";

const tabs = [
  { id:"local-ai", label:"🧠 Local AI" },
  { id:"agents", label:"🤖 Agents" },
  { id:"paas", label:"🛠️ PaaS" },
  { id:"xzero", label:"💱 xZero" },
];

export default function ProductPage() {
  const [active, setActive] = useState("local-ai");
  return (
    <div className="pt-16 min-h-screen">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">What <span className="text-[#00FF9D]">GodLocal</span> can do</h1>
          <p className="text-[#E0E0E0]/50 text-xl max-w-2xl mx-auto">Four capabilities. One platform.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActive(tab.id)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${active === tab.id ? "bg-[#00FF9D] text-[#0A0C0F]" : "border border-[#333] text-[#E0E0E0]/60 hover:text-[#E0E0E0] hover:border-[#00FF9D]/30"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <motion.div key={active} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.2}} className="max-w-4xl mx-auto">
          {active === "local-ai" && (
            <div className="card">
              <h3 className="text-2xl font-bold mb-4">Local AI Inference</h3>
              <p className="text-[#E0E0E0]/60 mb-6">TieredRouter automatically selects the best inference backend — balancing speed, cost, and capability.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#333]">
                    <th className="text-left py-3 pr-6 text-[#E0E0E0]/50 font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-[#00FF9D] font-bold">GodLocal</th>
                    <th className="text-center py-3 px-4 text-[#E0E0E0]/50">Ollama</th>
                    <th className="text-center py-3 px-4 text-[#E0E0E0]/50">LM Studio</th>
                  </tr></thead>
                  <tbody className="divide-y divide-[#333]/50">
                    {[["Smart routing","✅","❌","❌"],["Cloud fallback","✅","❌","❌"],["Autonomous agents","✅","❌","❌"],["iPhone native","✅","❌","❌"],["~17k tok/s","✅","~4k","~4k"],["Open source","✅","✅","❌"]].map(r => (
                      <tr key={r[0]}><td className="py-3 pr-6 text-[#E0E0E0]/70">{r[0]}</td><td className="py-3 px-4 text-center text-[#00FF9D]">{r[1]}</td><td className="py-3 px-4 text-center text-[#E0E0E0]/40">{r[2]}</td><td className="py-3 px-4 text-center text-[#E0E0E0]/40">{r[3]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {active === "agents" && (
            <div className="grid md:grid-cols-2 gap-4">
              {[["SparkNet","Q-Learning idea evaluator. EMA scoring. SQLite persistence."],["Memory Graph","Associative memory with temporal anchors."],["Emotion Engine","Curiosity, focus, energy affect decisions."],["Self-Reflection","ConsciousnessLoop every 5 min."],["GlintSignalBus","Signals from web, GitHub, social, markets."],["Social Integration","Post autonomously via Composio."]].map(([t,d]) => (
                <div key={t} className="card"><h4 className="font-bold text-[#00FF9D] mb-2">{t}</h4><p className="text-sm text-[#E0E0E0]/50">{d}</p></div>
              ))}
            </div>
          )}
          {active === "paas" && (
            <div className="space-y-3">
              {[["🚀","Git-native deploy","Push to main, live in under 60 seconds."],["🐳","Docker support","Bring your Dockerfile, we handle the rest."],["🔐","Secrets management","Encrypted env vars, never in your repo."],["🗄️","Databases","PostgreSQL + Redis in one click."],["📊","Monitoring","Real-time logs, metrics, terminal access."]].map(([icon,t,d]) => (
                <div key={t} className="flex items-start gap-4 card"><span className="text-2xl">{icon}</span><div><h4 className="font-semibold mb-1">{t}</h4><p className="text-sm text-[#E0E0E0]/50">{d}</p></div></div>
              ))}
            </div>
          )}
          {active === "xzero" && (
            <div className="grid md:grid-cols-2 gap-4">
              {[["Jupiter Integration","Best-price DEX routing on Solana."],["Circuit Breaker","Auto-halt on drawdown. Configurable risk."],["Market Analysis","BTC/ETH/SOL/BNB/SUI via CoinGecko. 5-min cache."],["Kill Switch","Emergency stop via API."],["ReAct Trading Loop","5-tool chain with market data + spark injection."],["Solana CLI","Full toolkit for wallet management."]].map(([t,d]) => (
                <div key={t} className="card"><h4 className="font-bold text-[#00FF9D] mb-2">{t}</h4><p className="text-sm text-[#E0E0E0]/50">{d}</p></div>
              ))}
            </div>
          )}
        </motion.div>
        <div className="text-center mt-12">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-base px-8 py-4">View on GitHub →</a>
        </div>
      </div>
    </div>
  );
}