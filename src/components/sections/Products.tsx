"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const products = [
  {
    id: "godlocal",
    name: "GodLocal",
    tagline: "Sovereign AI Ecosystem",
    desc: "The core platform. Your own autonomous AI stack — search, memory, integrations, code execution. A sovereign agent that works 24/7 on your behalf.",
    url: "/oasis",
    cta: "Enter GodLocal",
    tag: "Platform · Core",
    color: "#00FF9D",
    colorBg: "rgba(0,255,157,0.06)",
    colorBorder: "rgba(0,255,157,0.2)",
    icon: "⚡",
    status: "live",
    highlights: ["Autonomous AI", "7 Parallel Agents", "Persistent Memory", "Council Mode"],
  },
  {
    id: "oasis",
    name: "Oasis",
    tagline: "Multi-Agent AI Terminal",
    desc: "Seven autonomous agents working simultaneously. Live tool feed, memory graph, artifact gallery, and 3-tier voting. The intelligence hub of the platform.",
    url: "/oasis",
    cta: "Launch Oasis",
    tag: "AI Workspace",
    color: "#00B4D8",
    colorBg: "rgba(0,180,216,0.06)",
    colorBorder: "rgba(0,180,216,0.2)",
    icon: "🏛",
    status: "live",
    highlights: ["7 Parallel Agents", "Live Tool Feed", "Memory Graph", "Council Mode"],
  },
  {
    id: "game",
    name: "Game",
    tagline: "Reality-Hacking RPG",
    desc: "Solo RPG card system — 4 streams (Воля, Алхимия, Тень, Синхрония). Daily 10-min cycle, Synthesis ritual, 30–90 day quest. Play offline. No app needed.",
    url: "/game",
    cta: "Play Game",
    tag: "Offline · Cards",
    color: "#FDCB6E",
    colorBg: "rgba(253,203,110,0.06)",
    colorBorder: "rgba(253,203,110,0.2)",
    icon: "∞",
    status: "live",
    highlights: ["4 Streams", "Daily Cycle", "Synthesis Ritual", "90-Day Quest"],
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
    icon: "📈",
    status: "live",
    highlights: ["Groq Streaming", "5 Data Sources", "AI Signals", "Solana Ready"],
  },
  {
    id: "nebudda",
    name: "NEBUDDA",
    tagline: "AI Social Network",
    desc: "Telegram-like ecosystem inside GodLocal — chats, channels, files, media, communities. GodLocal AI built into every conversation. Your sovereign social layer.",
    url: "#nebudda",
    cta: "Coming Soon",
    tag: "Social · Messaging",
    color: "#FD79A8",
    colorBg: "rgba(253,121,168,0.06)",
    colorBorder: "rgba(253,121,168,0.2)",
    icon: "🌸",
    status: "soon",
    highlights: ["Channels & Chats", "Files & Media", "AI in Every Chat", "Communities"],
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
            The Ecosystem
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="section-title mb-4"
          >
            Five products.{" "}
            <span className="text-[#00FF9D]">One sovereign platform.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[#E0E0E0]/50 text-lg max-w-2xl mx-auto"
          >
            AI workspace · crypto terminal · reality game · social network — all on one open infrastructure.
          </motion.p>
        </div>

        {/* Top row: GodLocal full-width hero card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}
          className="relative flex flex-col rounded-2xl border overflow-hidden group mb-6"
          style={{ background: products[0].colorBg, borderColor: products[0].colorBorder, backdropFilter: "blur(8px)" }}
        >
          <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${products[0].color}, #6C5CE7, transparent)` }} />
          <div className="flex flex-col md:flex-row gap-8 p-8 md:p-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{products[0].icon}</span>
                <h3 className="text-3xl font-extrabold" style={{ color: products[0].color }}>{products[0].name}</h3>
                <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,255,157,0.08)", border: "1px solid rgba(0,255,157,0.15)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#00FF9D]/70">live</span>
                </div>
              </div>
              <p className="text-sm font-mono mb-3" style={{ color: `${products[0].color}99` }}>{products[0].tagline}</p>
              <p className="text-[#E0E0E0]/60 text-base leading-relaxed mb-6 max-w-xl">{products[0].desc}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {products[0].highlights.map(h => (
                  <div key={h} className="flex items-center gap-2 text-xs text-[#E0E0E0]/50">
                    <span style={{ color: products[0].color }}>◈</span>{h}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center shrink-0">
              <Link href={products[0].url}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 group-hover:shadow-lg"
                style={{ background: `${products[0].color}18`, border: `1px solid ${products[0].color}40`, color: products[0].color }}
              >
                {products[0].cta} <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Bottom row: 4 product cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(1).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="relative flex flex-col rounded-2xl border overflow-hidden group"
              style={{ background: p.colorBg, borderColor: p.colorBorder, backdropFilter: "blur(8px)" }}
            >
              <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${p.color}, transparent)` }} />
              <div className="flex flex-col flex-1 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-2xl">{p.icon}</span>
                      <h3 className="text-xl font-extrabold" style={{ color: p.color }}>{p.name}</h3>
                    </div>
                    <p className="text-xs font-mono" style={{ color: `${p.color}99` }}>{p.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full"
                    style={{ background: p.status === "live" ? "rgba(0,255,157,0.08)" : "rgba(253,121,168,0.08)", border: p.status === "live" ? "1px solid rgba(0,255,157,0.15)" : "1px solid rgba(253,121,168,0.2)" }}>
                    {p.status === "live"
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" /><span className="text-[9px] font-mono text-[#00FF9D]/70">live</span></>
                      : <><span className="w-1.5 h-1.5 rounded-full bg-[#FD79A8]" /><span className="text-[9px] font-mono text-[#FD79A8]/70">soon</span></>
                    }
                  </div>
                </div>

                {/* Tag */}
                <div className="mb-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: p.color, background: `${p.color}15`, border: `1px solid ${p.color}25` }}>
                    {p.tag}
                  </span>
                </div>

                {/* Desc */}
                <p className="text-[#E0E0E0]/60 text-sm leading-relaxed mb-4 flex-1">{p.desc}</p>

                {/* Highlights */}
                <div className="grid grid-cols-2 gap-1.5 mb-6">
                  {p.highlights.map(h => (
                    <div key={h} className="flex items-center gap-1.5 text-xs text-[#E0E0E0]/40">
                      <span style={{ color: p.color }}>◈</span>{h}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link href={p.url}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group-hover:shadow-lg"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}40`, color: p.color,
                    opacity: p.status === "soon" ? 0.7 : 1,
                    cursor: p.status === "soon" ? "default" : "pointer" }}
                >
                  {p.cta} {p.status === "live" && <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
