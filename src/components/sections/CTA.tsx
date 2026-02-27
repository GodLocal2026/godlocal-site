'use client';
import { motion } from 'framer-motion';
import { GITHUB_URL } from '@/lib/utils';
export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-50"/>
      <div className="absolute inset-0 grid-bg opacity-50"/>
      <div className="container relative z-10 text-center">
        <motion.h2 initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="section-title mb-6">
          Your AI. <span className="text-primary glow-text">Start today.</span>
        </motion.h2>
        <motion.p initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.1}} className="text-foreground/50 text-xl max-w-2xl mx-auto mb-10">
          Open source. Free forever. No vendor lock-in. Your data stays yours.
        </motion.p>
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.2}} className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-lg px-10 py-4">Get Started on GitHub</a>
          <a href="/product" className="btn-outline text-lg px-10 py-4">Explore Features</a>
        </motion.div>
        <motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:0.4}} className="mt-8 text-sm text-foreground/30 font-mono">
          MIT License // Open Source // godlocal.ai
        </motion.p>
      </div>
    </section>
  );
}
