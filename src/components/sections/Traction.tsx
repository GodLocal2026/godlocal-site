"use client";
import { motion } from "framer-motion";

const stats = [
  { value: "3", label: "Live Products", sub: "Oasis · WOLF · Voice", color: "#00FF9D" },
  { value: "7", label: "Autonomous Agents", sub: "parallel, in council mode", color: "#00FF9D" },
  { value: "8", label: "Agent Tools", sub: "web · market · social · memory", color: "#00FF9D" },
  { value: "5", label: "Inference Tiers", sub: "WASM → GIANT", color: "#6C5CE7" },
  { value: "18+", label: "API Endpoints", sub: "REST + WebSocket", color: "#6C5CE7" },
  { value: "2.9k", label: "Lines of Code", sub: "production-grade", color: "#6C5CE7" },
];

const milestones = [
  { date: "Feb 26", label: "Platform v1.0 live on Render" },
  { date: "Feb 27", label: "Voice PWA + Jarvis v3.1 shipped" },
  { date: "Feb 28", label: "WOLF DeFi terminal live" },
  { date: "Mar 1", label: "Oasis full-stack agent UI live" },
];

export default function Traction() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#111316]/30">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(108,92,231,0.04) 0%, transparent 70%)" }} />
      <div className="container relative z-10">

        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full border border-[#6C5CE7]/20 bg-[#6C5CE7]/5 text-[#6C5CE7] text-xs font-mono mb-4"
          >
            Traction
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="section-title mb-4"
          >
            Built fast.{" "}
            <span style={{ background: "linear-gradient(135deg,#00FF9D 0%,#6C5CE7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Shipping faster.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-[#E0E0E0]/50 text-lg max-w-2xl mx-auto"
          >
            Three live products deployed in under a week. Real infrastructure. Real users.
          </motion.p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="card text-center"
            >
              <div className="text-4xl font-extrabold mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-sm font-semibold text-[#E0E0E0]/80 mb-1">{s.label}</div>
              <div className="text-xs text-[#E0E0E0]/35 font-mono">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <p className="text-center text-xs font-mono text-[#E0E0E0]/30 mb-6 uppercase tracking-widest">Sprint Log — Feb 26 → Mar 1, 2026</p>
          <div className="relative pl-8">
            <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gradient-to-b from-[#00FF9D]/40 via-[#6C5CE7]/30 to-transparent" />
            {milestones.map((m, i) => (
              <div key={i} className="relative mb-5 last:mb-0">
                <div className="absolute -left-8 top-1 w-3 h-3 rounded-full border-2" style={{ borderColor: i < 2 ? "#00FF9D" : "#6C5CE7", background: "#0A0C0F" }} />
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-mono text-[#00FF9D]/50 shrink-0">{m.date}</span>
                  <span className="text-sm text-[#E0E0E0]/70">{m.label}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
}
