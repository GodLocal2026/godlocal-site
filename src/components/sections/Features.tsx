'use client';
import { motion } from 'framer-motion';
const features = [
  { icon:'⚡', title:'Lightning Fast', description:'17,000 tokens/sec via smart routing. Run large models on a laptop. No GPU required.', tag:'Performance' },
  { icon:'🤖', title:'Autonomous Agents', description:'SOUL files, emotion maps, memory graphs. Your AI learns while you sleep.', tag:'Agents' },
  { icon:'🔒', title:'Privacy First', description:'All inference runs locally. Your data never leaves your machine. Zero telemetry.', tag:'Privacy' },
  { icon:'📱', title:'iPhone Native', description:'CoreML + ANE optimization. LFM2 24B at 40 tok/s. PARO 4B at 60 tok/s.', tag:'Mobile' },
  { icon:'🛠️', title:'Developer Ready', description:'Git-native deploy, Docker, env management, PostgreSQL/Redis in one click.', tag:'PaaS' },
  { icon:'💱', title:'xZero Trading', description:'Solana CLI, Jupiter integration, circuit breaker, autonomous market analysis.', tag:'Crypto' },
];
export default function Features() {
  return (
    <section className="py-24 bg-card-bg/30">
      <div className="container">
        <div className="text-center mb-16">
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="section-title mb-4">
            Everything you need. <span className="text-primary">Nothing you don&apos;t.</span>
          </motion.h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f,i) => (
            <motion.div key={f.title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}} className="card group cursor-default">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-primary/15 transition-colors">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-foreground">{f.title}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary/70 font-mono">{f.tag}</span>
                  </div>
                  <p className="text-sm text-foreground/50 leading-relaxed">{f.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
