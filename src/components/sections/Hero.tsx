'use client';
import { motion } from 'framer-motion';
import { GITHUB_URL } from '@/lib/utils';

const metrics = [
  { value: '17k', label: 'tok/s', sub: 'Taalas speed' },
  { value: '2.9k', label: 'lines', sub: 'of code' },
  { value: '18+', label: 'endpoints', sub: 'API surface' },
  { value: '60', label: 'tok/s', sub: 'on iPhone' },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay:'1.5s'}} />
      <div className="container relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-mono mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"/>Open Source // v2.0
          </motion.div>
          <motion.h1 initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.1}}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-none mb-6">
            Your AI.{' '}<span className="text-primary glow-text">Your machine.</span>
          </motion.h1>
          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.2}}
            className="text-xl md:text-2xl text-foreground/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            The fastest local AI inference platform with autonomous agents. Open source. Privacy first.{' '}
            <span className="text-foreground/80">Runs even on iPhone.</span>
          </motion.p>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.3}}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-primary text-base px-8 py-4">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              View on GitHub
            </a>
            <a href="/product" className="btn-outline text-base px-8 py-4">Explore Features →</a>
          </motion.div>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.4}}
            className="inline-block text-left bg-card-bg border border-border rounded-xl p-4 mb-16 font-mono text-sm glow-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-red-500/70"/><div className="w-3 h-3 rounded-full bg-yellow-500/70"/><div className="w-3 h-3 rounded-full bg-primary/70"/>
              <span className="ml-2 text-foreground/30 text-xs">terminal</span>
            </div>
            <div className="space-y-1">
              <div><span className="text-secondary">$</span> <span className="text-foreground/80">git clone https://github.com/GODLOCAL/godlocal</span></div>
              <div><span className="text-secondary">$</span> <span className="text-foreground/80">cd godlocal && npm install && npm run dev</span></div>
              <div className="text-primary">✓ GodLocal running on localhost:3000</div>
              <div className="text-foreground/40">  TieredRouter ready // 5 tiers active</div>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.5}}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((m,i) => (
              <div key={i} className="card text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-primary mb-1 glow-text">{m.value}</div>
                <div className="text-sm font-semibold text-foreground/80">{m.label}</div>
                <div className="text-xs text-foreground/40 mt-1">{m.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
