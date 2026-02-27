"use client";
import { motion } from "framer-motion";

const features = [
  { icon:"⚡", title:"Lightning Fast", desc:"17,000 tokens/sec via smart routing. Run large models on a laptop.", tag:"Performance" },
  { icon:"🤖", title:"Autonomous Agents", desc:"SOUL files, emotion maps, memory graphs. Your AI learns while you sleep.", tag:"Agents" },
  { icon:"🔒", title:"Privacy First", desc:"All inference runs locally. Your data never leaves your machine.", tag:"Privacy" },
  { icon:"📱", title:"iPhone Native", desc:"CoreML + ANE. LFM2 24B @ 40 tok/s. PARO 4B @ 60 tok/s.", tag:"Mobile" },
  { icon:"🛠️", title:"Developer Ready", desc:"Git-native deploy, Docker, env management, PostgreSQL/Redis.", tag:"PaaS" },
  { icon:"💱", title:"xZero Trading", desc:"Solana CLI, Jupiter integration, circuit breaker, AI market analysis.", tag:"Crypto" },
];

export default function Features() {
  return (
    <section className="py-24 bg-[#111316]/30">
      <div className="container">
        <div className="text-center mb-16">
          <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="section-title mb-4">
            Everything you need. <span className="text-[#00FF9D]">Nothing you don&apos;t.</span>
          </motion.h2>
          <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}}
            className="text-[#E0E0E0]/50 text-lg max-w-2xl mx-auto">Local inference, autonomous agents, PaaS, and crypto tools in one platform.</motion.p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f,i) => (
            <motion.div key={f.title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}} className="card group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#00FF9D]/10 border border-[#00FF9D]/20 flex items-center justify-center text-2xl flex-shrink-0">{f.icon}</div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold">{f.title}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#00FF9D]/10 text-[#00FF9D]/70 font-mono">{f.tag}</span>
                  </div>
                  <p className="text-sm text-[#E0E0E0]/50 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}