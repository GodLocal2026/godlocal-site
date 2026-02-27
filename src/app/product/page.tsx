'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GITHUB_URL } from '@/lib/utils';
const tabs = [{ id:'local-ai',label:'🧠 Local AI' },{ id:'agents',label:'🤖 Agents' },{ id:'paas',label:'🛠️ PaaS' },{ id:'xzero',label:'💱 xZero' }];
export default function ProductPage() {
  const [tab,setTab] = useState('local-ai');
  return (
    <div className="pt-16 min-h-screen">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">What <span className="text-primary">GodLocal</span> can do</h1>
          <p className="text-foreground/50 text-xl max-w-2xl mx-auto">Four capabilities. One platform.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${tab===t.id?'bg-primary text-background':'border border-border text-foreground/60 hover:text-foreground hover:border-primary/30'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <motion.div key={tab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.2}} className="max-w-4xl mx-auto">
          {tab==='local-ai' && (
            <div className="card">
              <h3 className="text-2xl font-bold mb-4">Local AI Inference</h3>
              <p className="text-foreground/60 mb-6">TieredRouter automatically selects the best backend — balancing speed, cost, and capability without any config.</p>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left py-3 pr-6 text-foreground/50">Feature</th><th className="text-center py-3 px-4 text-primary font-bold">GodLocal</th><th className="text-center py-3 px-4 text-foreground/50">Ollama</th><th className="text-center py-3 px-4 text-foreground/50">LM Studio</th></tr></thead>
              <tbody className="divide-y divide-border/50">{[['Smart routing','✅','❌','❌'],['Autonomous agents','✅','❌','❌'],['iPhone native','✅','❌','❌'],['~17k tok/s','✅','~4k','~4k'],['Open source','✅','✅','❌']].map(([f,g,o,l])=>(
                <tr key={f as string}><td className="py-3 pr-6 text-foreground/70">{f}</td><td className="py-3 px-4 text-center text-primary">{g}</td><td className="py-3 px-4 text-center text-foreground/40">{o}</td><td className="py-3 px-4 text-center text-foreground/40">{l}</td></tr>
              ))}</tbody></table></div>
            </div>
          )}
          {tab==='agents' && (
            <div className="grid md:grid-cols-2 gap-4">
              {[['SparkNet','Q-Learning idea evaluator with EMA scoring.'],['Memory Graph','Associative memory with temporal anchors.'],['Emotion Engine','Curiosity, focus, energy affect decisions.'],['Self-Reflection','ConsciousnessLoop triggers every 5 min.'],['GlintSignalBus','Signals from web, GitHub, social, markets.'],['Social Integration','Post to Twitter/Telegram autonomously.']].map(([t,d])=>(
                <div key={t as string} className="card"><h4 className="font-bold text-primary mb-2">{t}</h4><p className="text-sm text-foreground/50">{d}</p></div>
              ))}
            </div>
          )}
          {tab==='paas' && (
            <div className="space-y-3">
              {[['🚀','Git-native deploy','Push to main, live in 60 seconds.'],['🐳','Docker','Bring your Dockerfile.'],['🔐','Secrets','Encrypted env vars, never in your repo.'],['🗄️','Databases','PostgreSQL + Redis in one click.'],['📊','Monitoring','Real-time logs, metrics, terminal access.']].map(([i,t,d])=>(
                <div key={t as string} className="flex items-start gap-4 card"><span className="text-2xl">{i}</span><div><h4 className="font-semibold mb-1">{t}</h4><p className="text-sm text-foreground/50">{d}</p></div></div>
              ))}
            </div>
          )}
          {tab==='xzero' && (
            <div className="grid md:grid-cols-2 gap-4">
              {[['Jupiter Integration','Best-price DEX routing on Solana.'],['Circuit Breaker','Auto-halt on configurable drawdown limits.'],['Market Analysis','BTC/ETH/SOL prices via CoinGecko, 5-min cache.'],['Kill Switch','Emergency stop via API.'],['ReAct Loop','5-tool trading chain with llama-3.3-70b.'],['CLI Tools','Full Solana CLI toolkit.']].map(([t,d])=>(
                <div key={t as string} className="card"><h4 className="font-bold text-primary mb-2">{t}</h4><p className="text-sm text-foreground/50">{d}</p></div>
              ))}
            </div>
          )}
        </motion.div>
        <div className="text-center mt-16">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-base px-8 py-4">View on GitHub →</a>
        </div>
      </div>
    </div>
  );
}
