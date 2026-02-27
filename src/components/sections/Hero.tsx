"use client";
import { motion } from "framer-motion";
import { GITHUB_URL } from "@/lib/utils";

const metrics = [
  { value: "17k", label: "tok/s", sub: "Taalas speed" },
  { value: "2.9k", label: "lines", sub: "of code" },
  { value: "18+", label: "endpoints", sub: "API surface" },
  { value: "60", label: "tok/s", sub: "on iPhone" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at center top, rgba(0,255,157,0.08) 0%, transparent 60%)"}} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF9D]/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#6C5CE7]/5 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay:"1.5s"}} />
      <div className="container relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00FF9D]/30 bg-[#00FF9D]/5 text-[#00FF9D] text-sm font-mono mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse" />
            Open Source // v2.0
          </motion.div>
          <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.1}}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-none mb-6">
            Your AI.{" "}
            <span className="text-[#00FF9D] glow-text">Your machine.</span>
          </motion.h1>
          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.2}}
            className="text-xl md:text-2xl text-[#E0E0E0]/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            The fastest local AI inference platform with autonomous agents.
            Open source. Privacy first.{" "}
            <span className="text-[#E0E0E0]/80">Runs even on iPhone.</span>
          </motion.p>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.3}}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-base px-8 py-4">View on GitHub →</a>
            <a href="/product" className="btn-outline text-base px-8 py-4">Explore Features →</a>
          </motion.div>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.4}}
            className="inline-block text-left bg-[#111316] border border-[#333] rounded-xl p-4 mb-16 font-mono text-sm glow-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-[#00FF9D]/70" />
              <span className="ml-2 text-[#E0E0E0]/30 text-xs">terminal</span>
            </div>
            <div className="space-y-1 text-sm">
              <div><span className="text-[#6C5CE7]">$</span> <span className="text-[#E0E0E0]/80">git clone https://github.com/GodLocal2026/godlocal-site</span></div>
              <div><span className="text-[#6C5CE7]">$</span> <span className="text-[#E0E0E0]/80">npm install && npm run dev</span></div>
              <div className="text-[#00FF9D]">✓ GodLocal running on localhost:3000</div>
              <div className="text-[#E0E0E0]/30">  TieredRouter ready // 5 tiers active</div>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.5}}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m,i) => (
              <div key={i} className="card text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-[#00FF9D] mb-1 glow-text">{m.value}</div>
                <div className="text-sm font-semibold text-[#E0E0E0]/80">{m.label}</div>
                <div className="text-xs text-[#E0E0E0]/40 mt-1">{m.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-[#E0E0E0]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}