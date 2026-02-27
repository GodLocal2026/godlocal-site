'use client';
import { motion } from 'framer-motion';
const tiers = [
  { id:'WASM', emoji:'⚡', speed:'~1k tok/s', desc:'Browser-native, zero install.', color:'from-blue-500/20 to-blue-500/5', border:'border-blue-500/30', text:'text-blue-400' },
  { id:'MICRO', emoji:'🪶', speed:'BitNet 0.4GB', desc:'Ultralight. Any hardware.', color:'from-cyan-500/20 to-cyan-500/5', border:'border-cyan-500/30', text:'text-cyan-400' },
  { id:'FAST', emoji:'🚀', speed:'17k tok/s', desc:'Taalas + Cerebras. Max throughput.', color:'from-primary/20 to-primary/5', border:'border-primary/30', text:'text-primary', featured:true },
  { id:'FULL', emoji:'☁️', speed:'Groq / Cerebras', desc:'Cloud accelerators as fallback.', color:'from-secondary/20 to-secondary/5', border:'border-secondary/30', text:'text-secondary' },
  { id:'GIANT', emoji:'🧠', speed:'AirLLM 70B+', desc:'Massive models on demand.', color:'from-purple-500/20 to-purple-500/5', border:'border-purple-500/30', text:'text-purple-400' },
];
export default function TieredRouter() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container">
        <div className="text-center mb-16">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
            className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-4">TieredRouter</motion.div>
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}}
            className="section-title mb-4">Smart routing. <span className="text-primary">5 levels deep.</span></motion.h2>
          <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.2}}
            className="text-foreground/50 text-lg max-w-2xl mx-auto">Every request routes to the optimal tier — saving up to 85% token costs.</motion.p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-0">
          {tiers.map((tier,i) => (
            <div key={tier.id} className="flex items-center gap-2 md:gap-0">
              <motion.div initial={{opacity:0,scale:0.9}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{delay:i*0.1}}
                className={`relative w-48 card bg-gradient-to-b ${tier.color} border ${tier.border} ${tier.featured?'scale-105 shadow-lg shadow-primary/10':''}`}>
                {tier.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-background text-xs font-bold rounded-full">FASTEST</div>}
                <div className="text-2xl mb-2">{tier.emoji}</div>
                <div className={`font-mono font-bold text-lg ${tier.text} mb-1`}>{tier.id}</div>
                <div className="text-xs font-semibold text-foreground/60 mb-2">{tier.speed}</div>
                <div className="text-xs text-foreground/40 leading-relaxed">{tier.desc}</div>
              </motion.div>
              {i < tiers.length-1 && <><div className="hidden md:block mx-2 text-foreground/20 text-xl">→</div><div className="md:hidden my-1 text-foreground/20 text-xl rotate-90">→</div></>}
            </div>
          ))}
        </div>
        <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} className="text-center mt-8 text-sm text-foreground/30 font-mono">
          ~80-85% token cost savings // auto-fallback // zero config
        </motion.p>
      </div>
    </section>
  );
}
