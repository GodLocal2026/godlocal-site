"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { GITHUB_URL } from "@/lib/utils";

export default function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,255,157,0.07) 0%, transparent 60%)" }} />
      <div className="absolute inset-0 grid-bg opacity-50" />

      <div className="container relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="inline-block px-3 py-1 rounded-full border border-[#00FF9D]/20 bg-[#00FF9D]/5 text-[#00FF9D] text-xs font-mono mb-6"
        >
          Early Access · Open Source
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="section-title mb-6"
        >
          The platform is{" "}
          <span className="text-[#00FF9D] glow-text">live now.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
          className="text-[#E0E0E0]/50 text-xl max-w-2xl mx-auto mb-10"
        >
          Try Oasis, explore WOLF, fork the repo — or reach out if you want to build with us.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <Link href="/oasis" className="btn-primary text-lg px-10 py-4">
            Launch Oasis ⚡
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-outline text-lg px-10 py-4">
            View on GitHub
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.35 }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-2"
        >
          {["MIT License", "Free Forever", "No Vendor Lock-in", "Self-Hostable"].map(t => (
            <span key={t} className="text-sm text-[#E0E0E0]/25 font-mono">// {t}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
