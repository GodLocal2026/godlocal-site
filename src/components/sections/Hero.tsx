'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated brain-like neural background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        {/* Neural connection lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(16,185,129,0.4) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Brain-Inspired · Local-First · Open Core
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1]">
            One God-AI.{' '}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
              Your Device.
            </span>
            <br />
            <span className="text-gray-400 text-4xl md:text-5xl font-bold">Zero Cloud.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Not a swarm of weak agents — a single omnipotent brain-inspired AI
            with Hippocampus memory, Predictive Coding, and Free Energy minimization.
            Runs 70B+ models on 4 GB RAM via AirLLM layer streaming.
          </p>

          {/* Architecture pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              { icon: '🧠', label: 'Prefrontal God-Core' },
              { icon: '💡', label: 'AirLLM Layer Streaming' },
              { icon: '🔮', label: 'Free Energy Principle' },
              { icon: '📱', label: 'iPhone / Mac / PC' },
              { icon: '🔒', label: '100% Local' },
            ].map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-400 text-xs"
              >
                <span>{pill.icon}</span>
                {pill.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/ai"
              className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-lg shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-[1.02]"
            >
              Try GodLocal AI
              <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
            </Link>
            <a
              href="https://github.com/GodLocal2026/godlocal"
              target="_blank"
              rel="noopener"
              className="px-8 py-3.5 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/[0.04] transition-all"
            >
              View on GitHub
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: '70B+', label: 'Model Parameters' },
              { value: '4 GB', label: 'Min RAM Required' },
              { value: '0', label: 'Cloud Dependencies' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
