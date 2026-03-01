"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const products = [
  {
    id: "oasis",
    name: "Oasis",
    tagline: "Multi-Agent AI Terminal",
    desc: "Seven autonomous agents working simultaneously. Live tool feed, memory graph, artifact gallery, and 3-tier voting. The intelligence hub of the platform.",
    url: "/oasis",
    cta: "Launch Oasis",
    tag: "AI Workspace",
    color: "#00FF9D",
    colorBg: "rgba(0,255,157,0.06)",
    colorBorder: "rgba(0,255,157,0.2)",
    icon: "⚡",
    status: "live",
    highlights: ["7 Parallel Agents", "Live Tool Feed", "Memory Graph", "Council Mode"],
  },
  {
    id: "wolf",
    name: "WOLF",
    tagline: "AI Crypto Terminal",
    desc: "Real-time multi-market data — CoinGecko, Yahoo Finance, Fear & Greed index. Groq streaming AI analysis. Wolf of Wall Street persona. Solana-native.",
    url: "/static/pwa/smertch.html",
    cta: "Open WOLF",
    tag: "DeFi · Trading",
    color: "#6C5CE7",
    colorBg: "rgba(108,92,231,0.06)",
    colorBorder: "rgba(108,92,231,0.2)",
    icon: "🐺",
    status: "live",
    highlights: ["Groq Streaming", "5 Data Sources", "AI Signals", "Solana Ready"],
  },
  {
    id: "voice",
    name: "Voice",
    tagline: "AI Voice Assistant",
    desc: "Push-to-talk voice interface bridging to the GodLocal agent network. Jarvis v3.1 with SQLite persistent memory, 6 tools, and Gemini 2.0 Flash.",
    url: "/static/pwa/voice.html",
    cta: "Try Voice",
    tag: "Consumer · PWA",
    color: "#00B4D8",
    colorBg: "rgba(0,180,216,0.06)",
    colorBorder: "rgba(0,180,216,0.2)",
    icon: "🎙️",
    status: "live",
    highlights: ["Gemini 2.0", "SQLite Memory", "6 Agent Tools", "PWA Mobile"],
  },
];

export default function Products() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="container relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full border border-[#00FF9D]/20 bg-[#00FF9D]/5 text-[#00FF9D] text-xs font-mono mb-4"
          >
            Live Products
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="section-title mb-4"
          >
            Three products.{" "}
            <span className="text-[#00FF9D]">One platform.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[#E0E0E0]/50 text-lg max-w-2xl mx-auto"
          >
            AI workspace, crypto terminal, and voice assistant — all shipping on the same infrastructure.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative flex flex-col rounded-2xl border overflow-hidden group"
              style={{
                background: p.colorBg,
                borderColor: p.colorBorder,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Top accent line */}
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${p.color}, transparent)` }} />

              <div className="flex flex-col flex-1 p-8">
                {/* Header row */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{p.icon}</span>
                      <h3 className="text-2xl font-extrabold" style={{ color: p.color }}>{p.name}</h3>
                    </div>
                    <p className="text-sm font-mono" style={{ color: `${p.color}99` }}>{p.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,255,157,0.08)", border: "1px solid rgba(0,255,157,0.15)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
                    <span className="text-[10px] font-mono text-[#00FF9D]/70">live</span>
                  </div>
                </div>

                {/* Tag */}
                <div className="mb-4">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: p.color, background: `${p.color}15`, border: `1px solid ${p.color}25` }}>
                    {p.tag}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[#E0E0E0]/60 text-sm leading-relaxed mb-6 flex-1">{p.desc}</p>

                {/* Highlights */}
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {p.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 text-xs text-[#E0E0E0]/50">
                      <span style={{ color: p.color }}>▸</span>
                      {h}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={p.url}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 group-hover:shadow-lg"
                  style={{
                    background: `${p.color}18`,
                    border: `1px solid ${p.color}40`,
                    color: p.color,
                  }}
                >
                  {p.cta}
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
