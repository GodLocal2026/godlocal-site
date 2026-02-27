'use client';
import { motion } from 'framer-motion';
const models = [{ name:'LFM2 24B', speed:'40 tok/s', pct:'67%' },{ name:'PARO 4B', speed:'60 tok/s', pct:'100%' }];
export default function IPhoneDemo() {
  return (
    <section className="py-24 bg-card-bg/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} className="flex justify-center">
            <div className="relative">
              <div className="w-64 h-[520px] bg-gradient-to-b from-card-bg to-muted rounded-[3rem] border-2 border-border p-4 shadow-2xl shadow-primary/5">
                <div className="w-24 h-6 bg-background rounded-full mx-auto mb-4"/>
                <div className="bg-background rounded-2xl h-full p-4 overflow-hidden font-mono text-xs">
                  <div className="text-primary mb-3 font-bold">GodLocal // iPhone</div>
                  <div className="space-y-3">
                    {models.map((m,i) => (
                      <div key={m.name} className="bg-card-bg rounded-lg p-3 border border-border">
                        <div className="text-foreground/80 font-semibold mb-1">{m.name}</div>
                        <div className="flex items-center justify-between"><span className="text-foreground/40">CoreML+ANE</span><span className="text-primary font-bold">{m.speed}</span></div>
                        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                          <motion.div initial={{width:0}} whileInView={{width:m.pct}} viewport={{once:true}} transition={{duration:1,delay:0.5+i*0.2}} className="h-full bg-primary rounded-full"/>
                        </div>
                      </div>
                    ))}
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <div className="text-primary text-xs">✓ All data stays on device</div>
                      <div className="text-primary/60 text-xs mt-1">Zero cloud calls</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 -z-10 bg-primary/5 blur-3xl rounded-full"/>
            </div>
          </motion.div>
          <div>
            <motion.div initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}}
              className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono mb-6">iPhone // CoreML + ANE</motion.div>
            <motion.h2 initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.1}} className="section-title mb-6">
              AI in your pocket. <span className="text-primary">Without the cloud.</span>
            </motion.h2>
            <motion.ul initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:0.2}} className="space-y-4 mb-8">
              {['LFM2 24B — 40 tok/s on iPhone','PARO 4B — 60 tok/s with ANE','CoreML optimization built-in','100% private — zero telemetry'].map(t=>(
                <li key={t} className="flex items-center gap-3 text-foreground/70"><span>✅</span><span>{t}</span></li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}
