'use client';
import { motion } from 'framer-motion';
const items = [
  { icon:'🧠', title:'Memory Graph', desc:'SQLite-powered persistent memory across sessions.' },
  { icon:'❤️', title:'Emotion Map', desc:'Curiosity, focus, energy affect decision-making.' },
  { icon:'🔄', title:'ConsciousnessLoop', desc:'Autonomous self-reflection every 5 minutes.' },
  { icon:'✨', title:'SparkNet', desc:'Q-Learning idea evaluator with EMA judge.' },
  { icon:'📡', title:'GlintSignalBus', desc:'Real-time signals from 5 sources.' },
  { icon:'💰', title:'Agent Capital', desc:'Autonomous financial reasoning and portfolio tracking.' },
];
export default function Agents() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl"/></div>
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}}
              className="inline-block px-3 py-1 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-mono mb-6">Autonomous Agents</motion.div>
            <motion.h2 initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.1}} className="section-title mb-6">
              Agents with a <span className="gradient-text">soul.</span>
            </motion.h2>
            <motion.p initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.2}} className="text-foreground/50 text-lg mb-8 leading-relaxed">
              GodLocal agents have memory, emotions, and the ability to reflect, learn, and evolve — autonomously.
            </motion.p>
            <motion.div initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.3}} className="bg-card-bg border border-border rounded-xl p-4 font-mono text-xs">
              <div className="text-foreground/30 mb-2">// SOUL file</div>
              <div className="space-y-1">
                <div><span className="text-secondary">name</span>: <span className="text-primary">&quot;GodLocal&quot;</span></div>
                <div><span className="text-secondary">archetype</span>: <span className="text-primary">&quot;conductor&quot;</span></div>
                <div><span className="text-secondary">emotions</span>: {`{ curiosity: 0.9, focus: 0.8 }`}</div>
                <div><span className="text-secondary">loop_interval</span>: <span className="text-primary">300s</span></div>
              </div>
            </motion.div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {items.map((f,i) => (
              <motion.div key={f.title} initial={{opacity:0,scale:0.95}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{delay:i*0.08}} className="card text-center">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-foreground/40 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
