"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════
   MATRIX RAIN BACKGROUND
   ════════════════════════════════════════════════════════ */
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const cols = Math.floor(c.width / 14);
    const drops = Array(cols).fill(1);
    const chars = "アイウエオカキクケコ01ABCXYZ0123456789@#$%&*✕◎◈⬡";
    const t = setInterval(() => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#00FF41";
      ctx.font = "13px monospace";
      drops.forEach((y, i) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
        if (y * 14 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }, 50);
    return () => { clearInterval(t); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" />;
}

/* ════════════════════════════════════════════════════════
   PIXEL PROGRESS BAR
   ════════════════════════════════════════════════════════ */
function PixelBar({ value, color = "#00FF41", label }: { value: number; color?: string; label: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[9px] text-gray-600 mb-0.5">
        <span>{label}</span><span style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-[#111] border border-[#222] flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 mr-px" style={{
            background: i < Math.floor(value / 5) ? color : "transparent",
            boxShadow: i < Math.floor(value / 5) ? `0 0 4px ${color}` : "none"
          }} />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SPARKLINE SVG
   ════════════════════════════════════════════════════════ */
function Spark({ data, color = "#00FF41" }: { data: number[]; color?: string }) {
  const w = 60, h = 22;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / (mx - mn || 1)) * h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}

/* ════════════════════════════════════════════════════════
   MINING / HALVING CONFIG
   ════════════════════════════════════════════════════════ */
const MINING = {
  totalSupply: 21_000_000,
  mined: 4_847_200,
  blockReward: 100,           // текущая
  halvingEvery: 210_000,      // блоков
  nextHalving: 162_800,       // блоков осталось
  currentEra: 1,
  halvings: [
    { era: 0, reward: 200, blocks: "0 – 210K", status: "done" },
    { era: 1, reward: 100, blocks: "210K – 420K", status: "active" },
    { era: 2, reward: 50,  blocks: "420K – 630K", status: "future" },
    { era: 3, reward: 25,  blocks: "630K – 840K", status: "future" },
    { era: 4, reward: 12.5, blocks: "840K – 1.05M", status: "future" },
    { era: 5, reward: 6.25, blocks: "1.05M – 1.26M", status: "future" },
  ],
  earnMethods: [
    { method: "Daily Quest", xpPerBlock: 100, icon: "🎯" },
    { method: "Diary Entry", xpPerBlock: 60, icon: "📔" },
    { method: "Side Quest", xpPerBlock: 50, icon: "⚡" },
    { method: "Streak Bonus (7d)", xpPerBlock: 200, icon: "🔥" },
    { method: "Sprint Complete", xpPerBlock: 500, icon: "🏆" },
    { method: "Mentoring", xpPerBlock: 150, icon: "🤝" },
  ]
};

/* ════════════════════════════════════════════════════════
   GROKIPEDIA ARTICLES
   ════════════════════════════════════════════════════════ */
const ARTICLES = [
  { title: "Play-to-Earn: The Future of Gaming", url: "https://x.com/i/grok/share/wF43RFiYeqQaS", tag: "P2E", color: "#00FF41" },
  { title: "Bitcoin Halving Explained", url: "https://x.com/i/grok/share/QjZ2Gj8mKpRb4", tag: "CRYPTO", color: "#FFB800" },
  { title: "AI Coaching & Personal Growth", url: "https://x.com/i/grok/share/nVhG3KcR8tWy7", tag: "AI", color: "#00E5FF" },
  { title: "Tokenomics Design Patterns", url: "https://x.com/i/grok/share/pBqY5DjNfXm92", tag: "TOKEN", color: "#7B2FFF" },
  { title: "Solana DeFi Ecosystem 2026", url: "https://x.com/i/grok/share/rTkL7HnMwZv34", tag: "SOLANA", color: "#00FF41" },
  { title: "Mindfulness & Blockchain: Web3 Wellness", url: "https://x.com/i/grok/share/xWqP9VsJgKb56", tag: "WELLNESS", color: "#FD79A8" },
  { title: "DAO Governance Models", url: "https://x.com/i/grok/share/mNcR3FxHyTk78", tag: "DAO", color: "#FFB800" },
  { title: "Proof of Growth: New Consensus", url: "https://x.com/i/grok/share/kJvL1DpWzXn90", tag: "X100", color: "#00E5FF" },
];

const RECOMMENDATIONS = [
  { title: "Start X100 Journey", desc: "Begin your 100-day self-transformation quest", icon: "🧬", color: "#00FF41" },
  { title: "Mine X100 Tokens", desc: "Earn rewards for real personal growth", icon: "⛏️", color: "#FFB800" },
  { title: "Join the DAO", desc: "Vote on strategy and earn profit share", icon: "🏛️", color: "#7B2FFF" },
  { title: "AI Coach Session", desc: "Get personalized guidance from Буба 🧸", icon: "🤖", color: "#00E5FF" },
];

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function X100Oasis() {
  const [tab, setTab] = useState("wallet");
  const [cmdInput, setCmdInput] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [blockCount, setBlockCount] = useState(257_200);

  // Animate block counter
  useEffect(() => {
    const t = setInterval(() => setBlockCount(b => b + 1), 8000);
    return () => clearInterval(t);
  }, []);

  const doFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 1800); };

  const tabs = [
    { id: "wallet", icon: "◈", label: "WALLET" },
    { id: "mine", icon: "⛏", label: "MINE" },
    { id: "quest", icon: "◉", label: "QUEST" },
    { id: "learn", icon: "◫", label: "LEARN" },
    { id: "social", icon: "⬡", label: "SOCIAL" },
  ];

  const tokens = [
    { icon: "◎", name: "SOL", amount: "24.81", usd: "$3,120.45", change: "+5.2%", spark: [10, 15, 12, 18, 20, 18, 24] },
    { icon: "✕", name: "X100", amount: "1,000,000", usd: "$7,840.00", change: "+12.8%", spark: [5, 8, 15, 12, 22, 28, 26] },
    { icon: "◈", name: "USDC", amount: "1,886.87", usd: "$1,886.87", change: "+0.0%", spark: [10, 10, 10, 10, 10, 10, 10] },
  ];

  const realms = [
    { label: "BODY", val: 72, color: "#00FF41" },
    { label: "MIND", val: 58, color: "#00E5FF" },
    { label: "MONEY", val: 81, color: "#FFB800" },
    { label: "ENERGY", val: 65, color: "#00E5FF" },
    { label: "SOUL", val: 44, color: "#7B2FFF" },
  ];

  const leaderboard = [
    { rank: 1, name: "N1RV_SOL", roi: "+31%", xp: "14,280", badge: "👑" },
    { rank: 2, name: "K1TB_X", roi: "+24%", xp: "11,940", badge: "⚔" },
    { rank: 3, name: "SOL_ALCH", roi: "+18%", xp: "9,310", badge: "🔮" },
    { rank: 4, name: "PROX_AI", roi: "+15%", xp: "7,890", badge: "🎯" },
    { rank: 5, name: "ZENITH", roi: "+11%", xp: "5,420", badge: "🧬" },
  ];

  const quests = [
    { day: 14, title: "Shadow Dialogue", desc: "Write a conversation with your inner critic. Ask what it fears.", sprint: "Очищение", xp: 100, side: "10-min dance without music", sideXp: 50, mantra: "Я больше, чем мои мысли" },
  ];

  const Card = ({ border = "#00FF41", children, className = "" }: { border?: string; children: React.ReactNode; className?: string }) => (
    <div className={`bg-[#0A0A0A] p-3 mb-3 ${className}`} style={{ border: `1px solid ${border}` }}>{children}</div>
  );

  const Btn = ({ color = "#00FF41", children, onClick, full = false }: any) => (
    <button onClick={onClick} className={`px-3 py-2 text-[11px] font-mono tracking-wider transition-all hover:brightness-125 active:scale-95 ${full ? "w-full" : ""}`}
      style={{ background: "#000", border: `1px solid ${color}`, color }}>{children}</button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-2 font-mono">
      <div className="relative w-full max-w-[420px] min-h-[90vh] bg-black text-[#00FF41] overflow-hidden rounded-lg border border-[#111]"
        style={{ boxShadow: "0 0 40px rgba(0,255,65,0.05)" }}>
        <MatrixRain />

        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
            <Card><span className="text-base">{flash}</span></Card>
          </div>
        )}

        {/* ─── Status Bar ─────────────────────────── */}
        <div className="relative z-10 px-4 py-2 flex justify-between text-[10px] border-b border-[#111]">
          <span className="text-[#00FF41]">● CONNECTED</span>
          <span className="text-gray-600">X100 OASIS v3.0</span>
          <span className="text-[#FFB800]">SOL: $125.82</span>
        </div>

        {/* ─── Day Progress ───────────────────────── */}
        <div className="relative z-10 px-4 py-3 border-b border-[#111]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-600 tracking-widest">DAY 14/100 · SPRINT 2: ОЧИЩЕНИЕ</span>
            <span className="text-[10px] text-[#FFB800]">🔥 14 streak</span>
          </div>
          <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: "14%", background: "linear-gradient(90deg, #00FF41, #00E5FF)" }} />
          </div>
        </div>

        {/* ─── Tab Content ────────────────────────── */}
        <div className="relative z-10 overflow-y-auto px-4 py-3" style={{ height: "calc(90vh - 140px)" }}>

          {/* ════════════ WALLET TAB ════════════ */}
          {tab === "wallet" && (
            <div>
              {/* Total Balance */}
              <div className="text-center mb-5">
                <div className="text-[9px] text-gray-600 tracking-[3px] mb-1">TOTAL BALANCE</div>
                <div className="text-4xl font-bold" style={{ textShadow: "0 0 10px rgba(0,255,65,0.6)" }}>$12,847<span className="text-lg">.32</span></div>
                <div className="text-[11px] text-[#00FF41] mt-1">+8.4% ↑ this week</div>
              </div>

              {/* Tokens */}
              {tokens.map(t => (
                <Card key={t.name}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-xs font-bold">{t.name}</span>
                        <span className="text-xs font-bold">{t.amount}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>{t.usd}</span>
                        <span className="text-[#00FF41]">{t.change}</span>
                      </div>
                    </div>
                    <Spark data={t.spark} />
                  </div>
                </Card>
              ))}

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Btn onClick={() => doFlash("✓ SEND READY")} full>SEND</Btn>
                <Btn onClick={() => doFlash("✓ RECEIVE")} full color="#00E5FF">RECEIVE</Btn>
                <Btn onClick={() => doFlash("✓ SWAP")} full color="#FFB800">SWAP</Btn>
              </div>

              {/* Realms */}
              <div className="mt-4">
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">REALMS / CHARACTER STATS</div>
                {realms.map(r => <PixelBar key={r.label} value={r.val} color={r.color} label={r.label} />)}
              </div>
            </div>
          )}

          {/* ════════════ MINE TAB ════════════ */}
          {tab === "mine" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">X100 MINING · PROOF OF GROWTH</div>

              {/* Mining Overview */}
              <Card border="#FFB800">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-[#FFB800]" style={{ textShadow: "0 0 10px rgba(255,184,0,0.4)" }}>⛏ MINING</div>
                  <div className="text-[10px] text-gray-500 mt-1">Earn X100 tokens through real self-improvement</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#111] p-2 border border-[#222]">
                    <div className="text-[8px] text-gray-600 tracking-widest">TOTAL SUPPLY</div>
                    <div className="text-sm font-bold text-[#FFB800]">21,000,000</div>
                  </div>
                  <div className="bg-[#111] p-2 border border-[#222]">
                    <div className="text-[8px] text-gray-600 tracking-widest">MINED</div>
                    <div className="text-sm font-bold text-[#00FF41]">{(MINING.mined + blockCount - 257200).toLocaleString()}</div>
                  </div>
                  <div className="bg-[#111] p-2 border border-[#222]">
                    <div className="text-[8px] text-gray-600 tracking-widest">BLOCK REWARD</div>
                    <div className="text-sm font-bold text-[#00E5FF]">{MINING.blockReward} X100</div>
                  </div>
                  <div className="bg-[#111] p-2 border border-[#222]">
                    <div className="text-[8px] text-gray-600 tracking-widest">CURRENT BLOCK</div>
                    <div className="text-sm font-bold text-[#7B2FFF]">#{blockCount.toLocaleString()}</div>
                  </div>
                </div>
              </Card>

              {/* Supply Progress */}
              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">SUPPLY PROGRESS</div>
                <div className="h-3 bg-[#111] border border-[#222] rounded-sm overflow-hidden mb-1">
                  <div className="h-full" style={{
                    width: `${((MINING.mined) / MINING.totalSupply) * 100}%`,
                    background: "linear-gradient(90deg, #FFB800, #00FF41)"
                  }} />
                </div>
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>{((MINING.mined / MINING.totalSupply) * 100).toFixed(1)}% mined</span>
                  <span>{(MINING.totalSupply - MINING.mined).toLocaleString()} remaining</span>
                </div>
              </Card>

              {/* Halving Schedule */}
              <Card border="#FFB800">
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">⚡ HALVING SCHEDULE (like Bitcoin)</div>
                <div className="space-y-1.5">
                  {MINING.halvings.map(h => (
                    <div key={h.era} className="flex items-center gap-2 text-[10px]" style={{
                      opacity: h.status === "future" ? 0.5 : 1
                    }}>
                      <span className={`w-5 text-center ${h.status === "active" ? "text-[#FFB800]" : h.status === "done" ? "text-[#00FF41]" : "text-gray-700"}`}>
                        {h.status === "done" ? "✓" : h.status === "active" ? "►" : "○"}
                      </span>
                      <span className="w-14 text-gray-500">Era {h.era}</span>
                      <span className="flex-1 text-gray-400">{h.blocks}</span>
                      <span style={{ color: h.status === "active" ? "#FFB800" : h.status === "done" ? "#00FF41" : "#444" }}>
                        {h.reward} X100/block
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-[#FFB80008] border border-[#FFB80030] text-center">
                  <div className="text-[8px] text-gray-600 tracking-widest">NEXT HALVING IN</div>
                  <div className="text-lg font-bold text-[#FFB800]">{MINING.nextHalving.toLocaleString()} blocks</div>
                  <div className="text-[9px] text-gray-600">Reward drops: 100 → 50 X100</div>
                </div>
              </Card>

              {/* How to Mine */}
              <Card border="#00E5FF">
                <div className="text-[9px] text-[#00E5FF] tracking-widest mb-2">HOW TO MINE X100</div>
                <div className="space-y-2">
                  {MINING.earnMethods.map(m => (
                    <div key={m.method} className="flex items-center gap-2 text-[11px]">
                      <span className="text-base">{m.icon}</span>
                      <span className="flex-1 text-gray-300">{m.method}</span>
                      <span className="text-[#00E5FF] font-bold">+{m.xpPerBlock} X100</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[9px] text-gray-600 text-center">
                  Proof of Growth — невозможно нафармить ботами. Только реальный рост.
                </div>
              </Card>

              {/* Profit Distribution */}
              <Card border="#7B2FFF">
                <div className="text-[9px] text-[#7B2FFF] tracking-widest mb-2">DAO PROFIT DISTRIBUTION</div>
                <div className="space-y-1.5">
                  {[
                    { label: "Members", pct: 40, color: "#00FF41" },
                    { label: "Treasury", pct: 30, color: "#00E5FF" },
                    { label: "Dev Fund", pct: 20, color: "#FFB800" },
                    { label: "Burn 🔥", pct: 10, color: "#FD79A8" },
                  ].map(d => (
                    <div key={d.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-400">{d.label}</span>
                        <span style={{ color: d.color }}>{d.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#111]">
                        <div className="h-full" style={{ width: `${d.pct}%`, background: d.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ════════════ QUEST TAB ════════════ */}
          {tab === "quest" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">DAILY QUEST · DAY 14</div>

              {/* Today's Quest */}
              <Card border="#00E5FF">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎯</span>
                  <div>
                    <div className="text-sm font-bold text-[#00E5FF]">{quests[0].title}</div>
                    <div className="text-[9px] text-gray-600">Sprint 2: {quests[0].sprint} · +{quests[0].xp} X100</div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-3">{quests[0].desc}</p>

                <div className="bg-[#111] p-2 border border-[#222] mb-3">
                  <div className="text-[8px] text-gray-600 tracking-widest mb-1">МАНТРА ДНЯ</div>
                  <div className="text-xs text-[#FD79A8] text-center font-bold">「 {quests[0].mantra} 」</div>
                </div>

                <Btn onClick={() => doFlash("✓ QUEST COMPLETED +100 X100")} full color="#00E5FF">
                  COMPLETE QUEST →
                </Btn>
              </Card>

              {/* Side Quest */}
              <Card border="#7B2FFF">
                <div className="flex items-center gap-2 mb-2">
                  <span>⚡</span>
                  <span className="text-[10px] text-[#7B2FFF] tracking-widest">SIDE QUEST</span>
                  <span className="text-[10px] text-gray-600">+{quests[0].sideXp} X100</span>
                </div>
                <p className="text-[11px] text-gray-400">{quests[0].side}</p>
                <Btn onClick={() => doFlash("✓ SIDE QUEST +50 X100")} full color="#7B2FFF">
                  COMPLETE
                </Btn>
              </Card>

              {/* Journal */}
              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">📔 DAILY JOURNAL · +60 X100</div>
                <div className="mb-2">
                  <div className="text-[9px] text-gray-600 mb-1">Morning Check-in</div>
                  <textarea className="w-full bg-[#111] border border-[#222] text-[11px] text-gray-300 p-2 resize-none focus:border-[#00FF41] focus:outline-none"
                    rows={2} placeholder="Как ты себя чувствуешь? 2-3 предложения..." />
                </div>
                <div className="mb-2">
                  <div className="text-[9px] text-gray-600 mb-1">Evening Review</div>
                  <textarea className="w-full bg-[#111] border border-[#222] text-[11px] text-gray-300 p-2 resize-none focus:border-[#00FF41] focus:outline-none"
                    rows={2} placeholder="Что удалось? Чему научился? 1 урок дня..." />
                </div>
                <Btn onClick={() => doFlash("✓ JOURNAL SAVED +60 X100")} full>SAVE ENTRY</Btn>
              </Card>

              {/* Breathing Exercise */}
              <Card border="#FD79A8">
                <div className="text-[9px] text-[#FD79A8] tracking-widest mb-2">🫁 ДЫХАНИЕ · ПРАКТИКА 4-2-6</div>
                <div className="text-center py-3">
                  <div className="text-3xl mb-2">🫁</div>
                  <div className="text-[11px] text-gray-400">Вдох на 4 · Пауза на 2 · Выдох на 6</div>
                  <div className="text-[10px] text-gray-600 mt-1">5 циклов = 1 сессия</div>
                </div>
                <Btn onClick={() => doFlash("✓ BREATHING +20 X100")} full color="#FD79A8">START SESSION</Btn>
              </Card>
            </div>
          )}

          {/* ════════════ LEARN TAB ════════════ */}
          {tab === "learn" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">LEARN · GROKIPEDIA · RECOMMENDATIONS</div>

              {/* Recommendations */}
              <Card border="#00E5FF">
                <div className="text-[9px] text-[#00E5FF] tracking-widest mb-2">🌟 RECOMMENDED FOR YOU</div>
                <div className="space-y-2">
                  {RECOMMENDATIONS.map(r => (
                    <button key={r.title} onClick={() => doFlash(`→ ${r.title}`)}
                      className="w-full text-left flex items-center gap-3 p-2 bg-[#111] border border-[#222] hover:border-[#333] transition-all">
                      <span className="text-xl">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold" style={{ color: r.color }}>{r.title}</div>
                        <div className="text-[9px] text-gray-600">{r.desc}</div>
                      </div>
                      <span className="text-gray-700">→</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Grokipedia Articles */}
              <Card border="#FFB800">
                <div className="text-[9px] text-[#FFB800] tracking-widest mb-2">📚 GROKIPEDIA ARTICLES</div>
                <div className="space-y-1.5">
                  {ARTICLES.map(a => (
                    <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-[#111] border border-[#222] hover:border-[#444] transition-all group">
                      <span className="text-[8px] px-1.5 py-0.5 font-bold tracking-wider" style={{ background: a.color + "15", color: a.color, border: `1px solid ${a.color}40` }}>
                        {a.tag}
                      </span>
                      <span className="flex-1 text-[10px] text-gray-300 group-hover:text-white transition-colors truncate">
                        {a.title}
                      </span>
                      <span className="text-[10px] text-gray-700 group-hover:text-gray-400">↗</span>
                    </a>
                  ))}
                </div>
              </Card>

              {/* Learning Progress */}
              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">LEARNING MODULES</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#FFB800] font-bold text-sm">LVL 3</span>
                  <div className="flex-1 h-2 bg-[#111] border border-[#222]">
                    <div className="h-full" style={{ width: "56.8%", background: "linear-gradient(90deg, #FFB800, #00E5FF)" }} />
                  </div>
                  <span className="text-[9px] text-gray-600">2,840 / 5,000 XP</span>
                </div>
                {[
                  { name: "DeFi Basics", status: "done" },
                  { name: "Trading 101", status: "done" },
                  { name: "AI Agents", status: "active" },
                  { name: "X100 Method", status: "active" },
                  { name: "Shadow Work", status: "locked" },
                  { name: "DAO Governance", status: "locked" },
                ].map(m => (
                  <div key={m.name} className="flex items-center gap-2 text-[11px] py-1 border-b border-[#111]">
                    <span className={m.status === "done" ? "text-[#00FF41]" : m.status === "active" ? "text-[#FFB800]" : "text-gray-700"}>
                      {m.status === "done" ? "✓" : m.status === "active" ? "►" : "○"}
                    </span>
                    <span className={m.status === "locked" ? "text-gray-700" : "text-gray-300"}>{m.name}</span>
                    <span className="flex-1" />
                    <span className="text-[9px] text-gray-700">{m.status}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ════════════ SOCIAL TAB ════════════ */}
          {tab === "social" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">SOCIAL · TRIBE · LEADERBOARD</div>

              {/* Leaderboard */}
              <Card border="#FFB800">
                <div className="text-[9px] text-[#FFB800] tracking-widest mb-2">🏆 LEADERBOARD — TOP MINERS</div>
                <div className="space-y-1.5">
                  {leaderboard.map(p => (
                    <div key={p.name} className={`flex items-center gap-2 text-[11px] p-1.5 ${p.rank === 1 ? "bg-[#FFB80008] border border-[#FFB80020]" : ""}`}>
                      <span className="w-5 text-center text-gray-600">#{p.rank}</span>
                      <span className="text-base">{p.badge}</span>
                      <span className="flex-1 font-bold" style={{ color: p.rank === 1 ? "#FFB800" : p.rank === 2 ? "#00E5FF" : "#00FF41" }}>{p.name}</span>
                      <span className="text-[#00FF41]">{p.roi}</span>
                      <span className="text-[9px] text-gray-600">{p.xp} XP</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Activity Feed */}
              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">ACTIVITY FEED</div>
                {[
                  { msg: "N1RV_SOL completed Sprint 5 🏆", time: "2m", color: "#FFB800" },
                  { msg: "K1TB_X mined 500 X100 via quest", time: "15m", color: "#00FF41" },
                  { msg: "SOL_ALCH shared diary entry", time: "1h", color: "#00E5FF" },
                  { msg: "PROX_AI started Shadow Work module", time: "2h", color: "#7B2FFF" },
                  { msg: "ZENITH hit 30-day streak! 🔥", time: "4h", color: "#FD79A8" },
                  { msg: "Governance vote passed: Expand mining", time: "6h", color: "#FFB800" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] py-1.5 border-b border-[#0a0a0a]">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 text-gray-400">{e.msg}</span>
                    <span className="text-gray-700 text-[9px]">{e.time}</span>
                  </div>
                ))}
              </Card>

              {/* Chat Rooms */}
              <Card border="#00E5FF">
                <div className="text-[9px] text-[#00E5FF] tracking-widest mb-2">TRIBE CHANNELS</div>
                {[
                  { name: "🏛️ Alpha Corp DAO", members: 12, msg: "Strategy vote open" },
                  { name: "🧸 Буба Support", members: 47, msg: "Breathing session at 9pm" },
                  { name: "⚔ Warriors Guild", members: 8, msg: "Sprint 2 challenge" },
                  { name: "📔 Diary Circle", members: 23, msg: "Share your day 14 entry" },
                ].map(c => (
                  <button key={c.name} onClick={() => doFlash(`→ ${c.name}`)}
                    className="w-full text-left flex items-center gap-2 p-2 hover:bg-[#111] transition-all">
                    <span className="text-sm">{c.name.split(" ")[0]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-gray-300">{c.name.slice(3)}</div>
                      <div className="text-[9px] text-gray-600 truncate">{c.msg}</div>
                    </div>
                    <span className="text-[9px] text-gray-700">{c.members} ●</span>
                  </button>
                ))}
              </Card>
            </div>
          )}
        </div>

        {/* ─── Tab Navigation ─────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/95 border-t border-[#111] backdrop-blur-sm">
          <div className="flex">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 py-3 flex flex-col items-center gap-1 transition-all"
                style={{
                  color: tab === t.id ? "#00FF41" : "#333",
                  background: tab === t.id ? "rgba(0,255,65,0.03)" : "transparent",
                  borderTop: tab === t.id ? "1px solid #00FF41" : "1px solid transparent",
                }}>
                <span className="text-base">{t.icon}</span>
                <span className="text-[8px] tracking-widest">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
