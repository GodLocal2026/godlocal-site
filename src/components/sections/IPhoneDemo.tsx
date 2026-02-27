"use client";
import { motion } from "framer-motion";

export default function IPhoneDemo() {
  return (
    <section className="py-24 bg-[#111316]/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} className="flex justify-center">
            <div className="relative">
              <div className="w-60 h-[500px] bg-gradient-to-b from-[#111316] to-[#2A2A2A] rounded-[3rem] border-2 border-[#333] p-4 shadow-2xl shadow-[#00FF9D]/5">
                <div className="w-20 h-5 bg-[#0A0C0F] rounded-full mx-auto mb-4" />
                <div className="bg-[#0A0C0F] rounded-2xl h-full p-4 font-mono text-xs overflow-hidden">
                  <div className="text-[#00FF9D] mb-3 font-bold">GodLocal // iPhone</div>
                  <div className="space-y-3">
                    {[{name:"LFM2 24B", speed:"40 tok/s", w:"67%"},{name:"PARO 4B", speed:"60 tok/s", w:"100%"}].map((m,i) => (
                      <div key={m.name} className="bg-[#111316] rounded-lg p-3 border border-[#333]">
                        <div className="text-[#E0E0E0]/80 font-semibold mb-1">{m.name}</div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[#E0E0E0]/40 text-xs">CoreML + ANE</span>
                          <span className="text-[#00FF9D] font-bold">{m.speed}</span>
                        </div>
                        <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
                          <motion.div initial={{width:0}} whileInView={{width:m.w}} viewport={{once:true}} transition={{duration:1,delay:0.5+i*0.2}}
                            className="h-full bg-[#00FF9D] rounded-full" />
                        </div>
                      </div>
                    ))}
                    <div className="bg-[#00FF9D]/10 border border-[#00FF9D]/20 rounded-lg p-3">
                      <div className="text-[#00FF9D] text-xs">✓ All data stays on device</div>
                      <div className="text-[#00FF9D]/50 text-xs mt-1">Zero cloud calls</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 -z-10 bg-[#00FF9D]/5 blur-3xl rounded-full" />
            </div>
          </motion.div>
          <div>
            <motion.div initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}}
              className="inline-block px-3 py-1 rounded-full border border-[#00FF9D]/20 bg-[#00FF9D]/5 text-[#00FF9D] text-xs font-mono mb-6">iPhone // CoreML + ANE</motion.div>
            <motion.h2 initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.1}} className="section-title mb-6">
              AI in your pocket. <span className="text-[#00FF9D]">Without the cloud.</span>
            </motion.h2>
            <motion.p initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.2}}
              className="text-[#E0E0E0]/50 text-lg mb-8 leading-relaxed">
              GodLocal leverages Apple&apos;s Neural Engine to run full LLMs entirely on-device. No internet. No data leaks.
            </motion.p>
            <motion.ul initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.3}} className="space-y-3 mb-8">
              {["LFM2 24B — 40 tok/s on iPhone","PARO 4B — 60 tok/s with ANE","CoreML optimization built-in","100% private — zero telemetry"].map(t => (
                <li key={t} className="flex items-center gap-3 text-[#E0E0E0]/70"><span className="text-[#00FF9D]">✓</span>{t}</li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}