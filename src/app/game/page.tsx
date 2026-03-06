"use client";
import { useState, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════ */
const PROJECT_WALLET = "X100PoolProjectWallet111111111111111111111111";

const TABS = [
  { id: "home", label: "Home", icon: "⬡" },
  { id: "mine", label: "Mine", icon: "⛏" },
  { id: "quest", label: "Quest", icon: "◉" },
  { id: "learn", label: "Learn", icon: "◫" },
  { id: "tribe", label: "Tribe", icon: "☰" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ═══════════════════════════════════════════════
   PHANTOM WALLET
   ═══════════════════════════════════════════════ */
function getPhantom(): any {
  if (typeof window !== "undefined") {
    const w = window as any;
    return w?.phantom?.solana || w?.solana;
  }
  return null;
}

/* ═══════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════ */
const HALVING_SCHEDULE = [
  { era: 0, reward: 200, blocks: "0 – 210K", done: true },
  { era: 1, reward: 100, blocks: "210K – 420K", active: true },
  { era: 2, reward: 50, blocks: "420K – 630K" },
  { era: 3, reward: 25, blocks: "630K – 840K" },
  { era: 4, reward: 12.5, blocks: "840K – 1.05M" },
];

const EARN_METHODS = [
  { icon: "🎯", name: "Daily Quest", reward: "+100 X100", desc: "Complete your daily growth challenge" },
  { icon: "📔", name: "Diary Entry", reward: "+60 X100", desc: "Reflect and write morning/evening entries" },
  { icon: "⚡", name: "Side Quest", reward: "+50 X100", desc: "Quick bonus activities throughout the day" },
  { icon: "🔥", name: "7-Day Streak", reward: "+200 X100", desc: "Maintain consistency for a week" },
  { icon: "🏆", name: "Sprint Complete", reward: "+500 X100", desc: "Finish a 10-day themed sprint" },
  { icon: "🤝", name: "Mentoring", reward: "+150 X100", desc: "Help other members on their journey" },
];

const ARTICLES = [
  { title: "What is Play-to-Earn?", tag: "P2E", url: "https://coinmarketcap.com/academy/article/what-is-play-to-earn" },
  { title: "Bitcoin Halving Explained", tag: "CRYPTO", url: "https://www.investopedia.com/bitcoin-halving-4843769" },
  { title: "Tokenomics 101", tag: "TOKEN", url: "https://medium.com/coinmonks/tokenomics-101-the-basics-of-evaluating-cryptocurrencies-2e67e2b2e5e3" },
  { title: "Solana Ecosystem", tag: "SOLANA", url: "https://solana.com/ecosystem" },
  { title: "How DAOs Work", tag: "DAO", url: "https://ethereum.org/en/dao/" },
  { title: "Phantom Wallet Guide", tag: "WALLET", url: "https://phantom.app/learn/guides/how-to-create-a-new-wallet" },
  { title: "Jupiter DEX Swap", tag: "DEFI", url: "https://jup.ag/" },
  { title: "100 Days of Growth", tag: "X100", url: "https://www.amazon.com/dp/B0DFQ2VJKK" },
];

const LEADERBOARD = [
  { rank: 1, name: "N1RV_SOL", xp: "14,280", badge: "👑" },
  { rank: 2, name: "K1TB_X", xp: "11,940", badge: "⚔️" },
  { rank: 3, name: "SOL_ALCH", xp: "9,310", badge: "🔮" },
  { rank: 4, name: "PROX_AI", xp: "7,890", badge: "🎯" },
  { rank: 5, name: "ZENITH", xp: "5,420", badge: "🧬" },
];

const MODULES = [
  { name: "DeFi Basics", status: "done" as const },
  { name: "Trading 101", status: "done" as const },
  { name: "AI Agents", status: "active" as const },
  { name: "X100 Method", status: "active" as const },
  { name: "Shadow Work", status: "locked" as const },
  { name: "DAO Governance", status: "locked" as const },
];

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function X100Oasis() {
  const [tab, setTab] = useState<TabId>("home");
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solChange, setSolChange] = useState<number | null>(null);
  const [blockCount, setBlockCount] = useState(257_200);
  const [toast, setToast] = useState<string | null>(null);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateAmt, setDonateAmt] = useState("0.1");
  const [poolTotal] = useState(12.4);

  // Live SOL price
  useEffect(() => {
    const f = async () => {
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true");
        const d = await r.json();
        setSolPrice(d.solana.usd);
        setSolChange(d.solana.usd_24h_change);
      } catch {}
    };
    f();
    const t = setInterval(f, 60_000);
    return () => clearInterval(t);
  }, []);

  // Block counter
  useEffect(() => {
    const t = setInterval(() => setBlockCount((b) => b + 1), 8000);
    return () => clearInterval(t);
  }, []);

  // Auto-detect Phantom
  useEffect(() => {
    const p = getPhantom();
    if (p?.isConnected && p?.publicKey) setWalletAddr(p.publicKey.toString());
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const connectWallet = async () => {
    const p = getPhantom();
    if (!p) { window.open("https://phantom.app/", "_blank"); return; }
    try {
      const r = await p.connect();
      setWalletAddr(r.publicKey.toString());
      flash("Wallet connected");
    } catch {}
  };

  const handleDonate = () => {
    const url = `https://phantom.app/ul/send?to=${PROJECT_WALLET}&amount=${donateAmt}`;
    window.open(url, "_blank");
    setDonateOpen(false);
    flash(`Opening Phantom to send ${donateAmt} SOL...`);
  };

  const solBal = 24.81;
  const totalUsd = solPrice ? solBal * solPrice + 1886.87 : null;

  /* ─── Shared UI ───────────────────────── */
  const Badge = ({ children, color = "emerald" }: { children: React.ReactNode; color?: string }) => {
    const colors: Record<string, string> = {
      emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      gray: "bg-white/5 text-gray-400 border-white/10",
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[color] || colors.gray}`}>{children}</span>;
  };

  const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white tracking-wide">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0b0f] flex justify-center font-sans">
      <div className="w-full max-w-[460px] min-h-screen bg-[#0b0b0f] text-gray-300 flex flex-col">

        {/* ─── Toast ──────────────────────── */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-lg backdrop-blur-sm">
            {toast}
          </div>
        )}

        {/* ─── Donate Modal ───────────────── */}
        {donateOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setDonateOpen(false)}>
            <div className="w-full max-w-sm bg-[#12121a] border border-white/10 rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-white mb-1">Donate to Project Pool</h3>
              <p className="text-xs text-gray-500 mb-5">Support X100 development, collaborations & ecosystem growth</p>

              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pool Balance</div>
                <div className="text-xl font-bold text-emerald-400">{poolTotal.toFixed(2)} SOL</div>
                {solPrice && <div className="text-xs text-gray-500">≈ ${(poolTotal * solPrice).toFixed(0)} USD</div>}
              </div>

              <div className="text-xs text-gray-500 mb-2">Amount (SOL)</div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {["0.1", "0.5", "1", "5"].map((v) => (
                  <button key={v} onClick={() => setDonateAmt(v)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${donateAmt === v
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-white/5 text-gray-400 border border-white/5 hover:border-white/20"}`}>
                    {v}
                  </button>
                ))}
              </div>
              <input type="number" value={donateAmt} onChange={(e) => setDonateAmt(e.target.value)} step="0.01" min="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-center text-sm text-amber-400 font-bold focus:border-amber-500/50 focus:outline-none mb-4" />

              <button onClick={handleDonate} className="w-full py-3 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/25 transition-all active:scale-[0.98]">
                Send {donateAmt} SOL via Phantom
              </button>
              <div className="text-[10px] text-gray-600 text-center mt-3">
                Pool: {PROJECT_WALLET.slice(0, 8)}...{PROJECT_WALLET.slice(-4)}
              </div>
            </div>
          </div>
        )}

        {/* ─── Header ─────────────────────── */}
        <header className="px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-sm font-bold">∞</div>
              <div>
                <div className="text-sm font-bold text-white">X100 Oasis</div>
                <div className="text-[10px] text-gray-500">Play-to-Earn Self-Development</div>
              </div>
            </div>
            {walletAddr ? (
              <Badge color="emerald">● {walletAddr.slice(0, 4)}...{walletAddr.slice(-4)}</Badge>
            ) : (
              <button onClick={connectWallet} className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors font-medium">
                Connect Wallet →
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
            <span>Day <span className="text-white font-medium">14</span> / 100 — Sprint 2: Очищение</span>
            <span className="text-amber-400">🔥 14 day streak</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "14%", background: "linear-gradient(90deg, #10b981, #06b6d4)" }} />
          </div>
        </header>

        {/* ─── Tab Bar ────────────────────── */}
        <nav className="flex border-b border-white/5 px-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-center text-[11px] font-medium transition-all relative ${
                tab === t.id ? "text-emerald-400" : "text-gray-600 hover:text-gray-400"
              }`}>
              <span className="block text-base mb-0.5">{t.icon}</span>
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-emerald-400 rounded-full" />}
            </button>
          ))}
        </nav>

        {/* ─── Content ────────────────────── */}
        <main className="flex-1 overflow-y-auto px-5 py-6">

          {/* ═══ HOME ═══ */}
          {tab === "home" && (
            <>
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] rounded-xl p-5 mb-8">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Balance</div>
                <div className="text-3xl font-bold text-white mb-1">
                  {totalUsd ? `$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "..."}
                  <span className="text-lg text-gray-500">.{totalUsd ? ((totalUsd % 1) * 100).toFixed(0).padStart(2, "0") : "00"}</span>
                </div>
                {solChange !== null && (
                  <div className={`text-xs font-medium ${solChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    SOL {solChange >= 0 ? "+" : ""}{solChange.toFixed(1)}% (24h) · Live
                  </div>
                )}
              </div>

              {/* Tokens */}
              <Section title="Portfolio">
                <div className="space-y-3">
                  {[
                    { icon: "◎", name: "SOL", amount: solBal.toFixed(2), usd: solPrice ? `$${(solBal * solPrice).toFixed(0)}` : "...", color: "emerald" },
                    { icon: "∞", name: "X100", amount: "1,000,000", usd: "∞ priceless", color: "amber" },
                    { icon: "◈", name: "USDC", amount: "1,886.87", usd: "$1,886.87", color: "sky" },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${t.color === "amber" ? "bg-amber-500/10 text-amber-400" : t.color === "sky" ? "bg-sky-500/10 text-sky-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {t.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-white">{t.name}</span>
                          <span className="font-semibold text-white">{t.amount}</span>
                        </div>
                        <div className="text-[11px] text-gray-500">{t.usd}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Quick Actions */}
              <Section title="Quick Actions">
                <div className="grid grid-cols-3 gap-2.5">
                  <button onClick={() => window.open("https://jup.ag/swap/SOL-USDC", "_blank")}
                    className="flex flex-col items-center gap-1.5 p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all active:scale-[0.97]">
                    <span className="text-lg">⚡</span>
                    <span className="text-[11px] font-medium text-gray-400">Swap</span>
                  </button>
                  <button onClick={() => setDonateOpen(true)}
                    className="flex flex-col items-center gap-1.5 p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 transition-all active:scale-[0.97]">
                    <span className="text-lg">💎</span>
                    <span className="text-[11px] font-medium text-gray-400">Donate</span>
                  </button>
                  <button onClick={connectWallet}
                    className="flex flex-col items-center gap-1.5 p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/30 transition-all active:scale-[0.97]">
                    <span className="text-lg">👻</span>
                    <span className="text-[11px] font-medium text-gray-400">{walletAddr ? "Linked" : "Phantom"}</span>
                  </button>
                </div>
              </Section>

              {/* Realms */}
              <Section title="Character Realms">
                {[
                  { label: "Body", val: 72, color: "#10b981" },
                  { label: "Mind", val: 58, color: "#06b6d4" },
                  { label: "Money", val: 81, color: "#f59e0b" },
                  { label: "Energy", val: 65, color: "#06b6d4" },
                  { label: "Soul", val: 44, color: "#8b5cf6" },
                ].map((r) => (
                  <div key={r.label} className="mb-3">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-500">{r.label}</span>
                      <span className="font-medium" style={{ color: r.color }}>{r.val}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${r.val}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </Section>

              {/* Pool */}
              <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-400">Project Pool</div>
                  <div className="text-sm font-bold text-white">{poolTotal.toFixed(2)} SOL</div>
                  {solPrice && <div className="text-[11px] text-gray-500">≈ ${(poolTotal * solPrice).toFixed(0)}</div>}
                </div>
                <button onClick={() => setDonateOpen(true)} className="text-xs text-amber-400 border border-amber-500/20 rounded-lg px-3 py-2 hover:bg-amber-500/10 transition-all">
                  Contribute →
                </button>
              </div>
            </>
          )}

          {/* ═══ MINE ═══ */}
          {tab === "mine" && (
            <>
              <Section title="Mining Overview — Proof of Growth">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { label: "Total Supply", value: "21,000,000", color: "text-amber-400" },
                    { label: "Mined", value: `${(4_847_200 + blockCount - 257200).toLocaleString()}`, color: "text-emerald-400" },
                    { label: "Block Reward", value: "100 X100", color: "text-sky-400" },
                    { label: "Current Block", value: `#${blockCount.toLocaleString()}`, color: "text-violet-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{s.label}</div>
                      <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Supply Progress */}
                <div className="mb-2">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "23.1%", background: "linear-gradient(90deg, #f59e0b, #10b981)" }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>23.1% mined</span>
                    <span>16.15M remaining</span>
                  </div>
                </div>
              </Section>

              <Section title="Halving Schedule">
                <p className="text-xs text-gray-500 mb-3">Like Bitcoin — block rewards halve periodically, making early mining more valuable.</p>
                <div className="space-y-2">
                  {HALVING_SCHEDULE.map((h) => (
                    <div key={h.era} className={`flex items-center gap-3 p-2.5 rounded-lg ${h.active ? "bg-amber-500/[0.06] border border-amber-500/10" : "bg-white/[0.02] border border-white/[0.04]"} ${!h.done && !h.active ? "opacity-50" : ""}`}>
                      <span className={`text-xs w-4 text-center ${h.done ? "text-emerald-400" : h.active ? "text-amber-400" : "text-gray-600"}`}>
                        {h.done ? "✓" : h.active ? "►" : "○"}
                      </span>
                      <span className="text-xs text-gray-400 w-10">Era {h.era}</span>
                      <span className="text-xs text-gray-500 flex-1">{h.blocks}</span>
                      <span className={`text-xs font-semibold ${h.active ? "text-amber-400" : h.done ? "text-emerald-400" : "text-gray-600"}`}>{h.reward} X100</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Next Halving In</div>
                  <div className="text-lg font-bold text-amber-400">162,800 blocks</div>
                  <div className="text-[11px] text-gray-500">Reward: 100 → 50 X100</div>
                </div>
              </Section>

              <Section title="How to Mine X100">
                <p className="text-xs text-gray-500 mb-3">Earn tokens through real self-improvement. No bots, no fake farming — only Proof of Growth.</p>
                <div className="space-y-2">
                  {EARN_METHODS.map((m) => (
                    <div key={m.name} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-lg">{m.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">{m.name}</div>
                        <div className="text-[11px] text-gray-500">{m.desc}</div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{m.reward}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="DAO Profit Distribution">
                {[
                  { label: "Members", pct: 40, color: "#10b981" },
                  { label: "Treasury", pct: 30, color: "#06b6d4" },
                  { label: "Dev Fund", pct: 20, color: "#f59e0b" },
                  { label: "Burn 🔥", pct: 10, color: "#f43f5e" },
                ].map((d) => (
                  <div key={d.label} className="mb-3">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-500">{d.label}</span>
                      <span className="font-medium" style={{ color: d.color }}>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </Section>
            </>
          )}

          {/* ═══ QUEST ═══ */}
          {tab === "quest" && (
            <>
              <Section title="Daily Quest — Day 14">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Shadow Dialogue</h3>
                      <div className="text-[11px] text-gray-500">Sprint 2: Очищение · +100 X100</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Write a conversation with your inner critic. Ask what it fears. Listen without judgment, then respond with compassion.
                  </p>
                  <div className="bg-rose-500/[0.05] border border-rose-500/10 rounded-lg p-3 text-center mb-4">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Мантра дня</div>
                    <div className="text-sm text-rose-300 font-medium italic">「 Я больше, чем мои мысли 」</div>
                  </div>
                  <button onClick={() => flash("✓ Quest completed +100 X100")}
                    className="w-full py-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-semibold hover:bg-emerald-500/20 transition-all active:scale-[0.98]">
                    Complete Quest →
                  </button>
                </div>
              </Section>

              <Section title="Side Quest">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span>⚡</span>
                    <span className="text-xs font-medium text-violet-400">+50 X100</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">10-min dance without music — let your body move freely</p>
                  <button onClick={() => flash("✓ Side quest +50 X100")}
                    className="w-full py-2.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-semibold hover:bg-violet-500/20 transition-all">
                    Complete
                  </button>
                </div>
              </Section>

              <Section title="Daily Journal · +60 X100">
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Morning Check-in</label>
                    <textarea className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-xs text-gray-300 resize-none focus:border-emerald-500/30 focus:outline-none placeholder:text-gray-600" rows={2} placeholder="Как ты себя чувствуешь?..." />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 block mb-1">Evening Review</label>
                    <textarea className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-xs text-gray-300 resize-none focus:border-emerald-500/30 focus:outline-none placeholder:text-gray-600" rows={2} placeholder="Что удалось? 1 урок дня..." />
                  </div>
                </div>
                <button onClick={() => flash("✓ Journal saved +60 X100")}
                  className="w-full py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-500/20 transition-all">
                  Save Entry
                </button>
              </Section>

              <Section title="Breathing · 4-2-6 Practice">
                <div className="bg-rose-500/[0.03] border border-rose-500/10 rounded-xl p-5 text-center">
                  <div className="text-3xl mb-2">🫁</div>
                  <p className="text-xs text-gray-400 mb-4">Вдох на 4 · Пауза на 2 · Выдох на 6</p>
                  <button onClick={() => flash("✓ Breathing +20 X100")}
                    className="py-2.5 px-6 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/20 transition-all">
                    Start Session
                  </button>
                </div>
              </Section>
            </>
          )}

          {/* ═══ LEARN ═══ */}
          {tab === "learn" && (
            <>
              <Section title="Learning Modules" action={<Badge color="amber">LVL 3 · 2,840 / 5,000 XP</Badge>}>
                <div className="space-y-2">
                  {MODULES.map((m) => (
                    <div key={m.name} className={`flex items-center gap-3 p-3 rounded-lg border ${m.status === "locked" ? "opacity-40 " : ""}bg-white/[0.02] border-white/[0.04]`}>
                      <span className={`text-xs ${m.status === "done" ? "text-emerald-400" : m.status === "active" ? "text-amber-400" : "text-gray-600"}`}>
                        {m.status === "done" ? "✓" : m.status === "active" ? "►" : "○"}
                      </span>
                      <span className="text-xs text-white flex-1">{m.name}</span>
                      <Badge color={m.status === "done" ? "emerald" : m.status === "active" ? "amber" : "gray"}>{m.status}</Badge>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Articles & Resources">
                <p className="text-xs text-gray-500 mb-3">Curated reading to deepen your understanding of Web3, DeFi, and self-development.</p>
                <div className="space-y-2">
                  {ARTICLES.map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.12] transition-all group">
                      <Badge color="gray">{a.tag}</Badge>
                      <span className="text-xs text-gray-300 group-hover:text-white transition-colors flex-1 truncate">{a.title}</span>
                      <span className="text-gray-600 group-hover:text-gray-400 text-xs">↗</span>
                    </a>
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ═══ TRIBE ═══ */}
          {tab === "tribe" && (
            <>
              <Section title="Leaderboard — Top Miners">
                <div className="space-y-2">
                  {LEADERBOARD.map((p) => (
                    <div key={p.name} className={`flex items-center gap-3 p-3 rounded-lg ${p.rank === 1 ? "bg-amber-500/[0.06] border border-amber-500/10" : "bg-white/[0.02] border border-white/[0.04]"}`}>
                      <span className="text-xs text-gray-500 w-5 text-center">#{p.rank}</span>
                      <span className="text-base">{p.badge}</span>
                      <span className={`text-xs font-semibold flex-1 ${p.rank === 1 ? "text-amber-400" : "text-white"}`}>{p.name}</span>
                      <span className="text-xs text-gray-500">{p.xp} XP</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Activity Feed">
                {[
                  { msg: "N1RV_SOL completed Sprint 5 🏆", time: "2m" },
                  { msg: "K1TB_X mined 500 X100 via quest", time: "15m" },
                  { msg: "SOL_ALCH shared diary entry", time: "1h" },
                  { msg: "PROX_AI started Shadow Work module", time: "2h" },
                  { msg: "ZENITH hit 30-day streak! 🔥", time: "4h" },
                  { msg: "Pool donation: +2.5 SOL 💎", time: "5h" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                    <span className="text-xs text-gray-400 flex-1">{e.msg}</span>
                    <span className="text-[10px] text-gray-600">{e.time}</span>
                  </div>
                ))}
              </Section>

              <Section title="Tribe Channels">
                {[
                  { icon: "🏛️", name: "Alpha Corp DAO", members: 12, msg: "Strategy vote open" },
                  { icon: "🧸", name: "Буба Support", members: 47, msg: "Breathing session at 9pm" },
                  { icon: "⚔️", name: "Warriors Guild", members: 8, msg: "Sprint 2 challenge" },
                  { icon: "📔", name: "Diary Circle", members: 23, msg: "Share your day 14 entry" },
                ].map((c) => (
                  <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.10] transition-all cursor-pointer mb-2">
                    <span className="text-lg">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white">{c.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{c.msg}</div>
                    </div>
                    <span className="text-[10px] text-gray-600">{c.members}</span>
                  </div>
                ))}
              </Section>
            </>
          )}
        </main>

        {/* ─── SOL Price Footer ───────────── */}
        <footer className="px-5 py-2.5 border-t border-white/5 text-center">
          <span className="text-[10px] text-gray-600">
            SOL: {solPrice ? `$${solPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "..."} · Block #{blockCount.toLocaleString()} · Powered by CoinGecko
          </span>
        </footer>
      </div>
    </div>
  );
}
