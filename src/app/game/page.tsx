"use client";
import { useState, useEffect, useRef } from "react";

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
    const chars = "アイウエオカキクケコ01ABCXYZ0123456789@#$%&*✕◎◈⬡∞";
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
   SHARED UI COMPONENTS
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

function Spark({ data, color = "#00FF41" }: { data: number[]; color?: string }) {
  const w = 60, h = 22;
  const mn = Math.min(...data), mx = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / (mx - mn || 1)) * h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}

/* ════════════════════════════════════════════════════════
   PROJECT POOL WALLET — donate here
   ════════════════════════════════════════════════════════ */
const PROJECT_WALLET = "X100PoolProjectWallet111111111111111111111111";

/* ════════════════════════════════════════════════════════
   PHANTOM WALLET HELPERS
   ════════════════════════════════════════════════════════ */
function getPhantom(): any {
  if (typeof window !== "undefined") {
    const w = window as any;
    return w?.phantom?.solana || w?.solana;
  }
  return null;
}

async function connectPhantom(): Promise<string | null> {
  const phantom = getPhantom();
  if (!phantom) {
    window.open("https://phantom.app/", "_blank");
    return null;
  }
  try {
    const resp = await phantom.connect();
    return resp.publicKey.toString();
  } catch { return null; }
}

async function swapViaPhantom() {
  // Opens Jupiter swap in Phantom's built-in browser or external
  window.open("https://jup.ag/swap/SOL-USDC", "_blank");
}

async function donateToPool(amountSOL: number): Promise<boolean> {
  const phantom = getPhantom();
  if (!phantom) { window.open("https://phantom.app/", "_blank"); return false; }
  try {
    await phantom.connect();
    // Create transfer using Phantom signAndSendTransaction
    // This uses the simple Phantom transfer API
    const { PublicKey, Transaction, SystemProgram, Connection } = await import("@solana/web3.js");
    const connection = new Connection("https://api.mainnet-beta.solana.com");
    const fromPubkey = phantom.publicKey;
    const toPubkey = new PublicKey(PROJECT_WALLET);
    const lamports = Math.floor(amountSOL * 1e9);
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
    );
    tx.feePayer = fromPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signed = await phantom.signAndSendTransaction(tx);
    return !!signed?.signature;
  } catch (e) {
    console.error("Donate error:", e);
    return false;
  }
}

/* ════════════════════════════════════════════════════════
   MINING / HALVING CONFIG
   ════════════════════════════════════════════════════════ */
const MINING = {
  totalSupply: 21_000_000,
  mined: 4_847_200,
  blockReward: 100,
  halvingEvery: 210_000,
  nextHalving: 162_800,
  halvings: [
    { era: 0, reward: 200, blocks: "0 – 210K", status: "done" as const },
    { era: 1, reward: 100, blocks: "210K – 420K", status: "active" as const },
    { era: 2, reward: 50,  blocks: "420K – 630K", status: "future" as const },
    { era: 3, reward: 25,  blocks: "630K – 840K", status: "future" as const },
    { era: 4, reward: 12.5, blocks: "840K – 1.05M", status: "future" as const },
    { era: 5, reward: 6.25, blocks: "1.05M – 1.26M", status: "future" as const },
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
   GROKIPEDIA ARTICLES — clickable real links
   ════════════════════════════════════════════════════════ */
const ARTICLES = [
  { title: "What is Play-to-Earn? Complete Guide", url: "https://coinmarketcap.com/academy/article/what-is-play-to-earn", tag: "P2E", color: "#00FF41" },
  { title: "Bitcoin Halving: Why It Matters", url: "https://www.investopedia.com/bitcoin-halving-4843769", tag: "CRYPTO", color: "#FFB800" },
  { title: "AI-Powered Personal Development", url: "https://www.forbes.com/sites/forbestechcouncil/2024/01/ai-personal-development/", tag: "AI", color: "#00E5FF" },
  { title: "Tokenomics 101: Design Your Economy", url: "https://medium.com/coinmonks/tokenomics-101-the-basics-of-evaluating-cryptocurrencies-2e67e2b2e5e3", tag: "TOKEN", color: "#7B2FFF" },
  { title: "Solana Ecosystem Overview", url: "https://solana.com/ecosystem", tag: "SOLANA", color: "#00FF41" },
  { title: "Mindful Self-Development in Web3", url: "https://mirror.xyz/explore", tag: "WELLNESS", color: "#FD79A8" },
  { title: "How DAOs Actually Work", url: "https://ethereum.org/en/dao/", tag: "DAO", color: "#FFB800" },
  { title: "Phantom Wallet: Getting Started", url: "https://phantom.app/learn/guides/how-to-create-a-new-wallet", tag: "WALLET", color: "#00E5FF" },
  { title: "Jupiter Swap: DeFi on Solana", url: "https://jup.ag/", tag: "SWAP", color: "#00FF41" },
  { title: "100 Days of Self-Improvement", url: "https://www.amazon.com/dp/B0DFQ2VJKK", tag: "X100", color: "#FD79A8" },
];

const RECOMMENDATIONS = [
  { title: "Start X100 Journey", desc: "Begin your 100-day self-transformation quest", icon: "🧬", color: "#00FF41", action: "quest" },
  { title: "Mine X100 Tokens", desc: "Earn rewards for real personal growth", icon: "⛏️", color: "#FFB800", action: "mine" },
  { title: "Connect Phantom Wallet", desc: "Link your Solana wallet to start earning", icon: "👻", color: "#7B2FFF", action: "phantom" },
  { title: "Donate to Project Pool", desc: "Support X100 development & collaborations", icon: "💎", color: "#00E5FF", action: "donate" },
];

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function X100Oasis() {
  const [tab, setTab] = useState("wallet");
  const [flash, setFlash] = useState<string | null>(null);
  const [blockCount, setBlockCount] = useState(257_200);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solChange, setSolChange] = useState<number | null>(null);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [donateAmt, setDonateAmt] = useState("0.1");
  const [showDonate, setShowDonate] = useState(false);
  const [donating, setDonating] = useState(false);
  const [poolTotal, setPoolTotal] = useState(12.4); // demo starting pool

  // Animate block counter
  useEffect(() => {
    const t = setInterval(() => setBlockCount(b => b + 1), 8000);
    return () => clearInterval(t);
  }, []);

  // Fetch real SOL price from CoinGecko
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true");
        const data = await res.json();
        setSolPrice(data.solana.usd);
        setSolChange(data.solana.usd_24h_change);
      } catch { /* fallback stays null */ }
    };
    fetchPrice();
    const t = setInterval(fetchPrice, 60000); // refresh every 60s
    return () => clearInterval(t);
  }, []);

  // Check if Phantom is already connected
  useEffect(() => {
    const phantom = getPhantom();
    if (phantom?.isConnected && phantom?.publicKey) {
      setWalletAddr(phantom.publicKey.toString());
    }
  }, []);

  const doFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 2200); };

  const handleConnect = async () => {
    const addr = await connectPhantom();
    if (addr) { setWalletAddr(addr); doFlash(`✓ CONNECTED: ${addr.slice(0,4)}...${addr.slice(-4)}`); }
    else doFlash("→ Install Phantom Wallet");
  };

  const handleDonate = async () => {
    const amt = parseFloat(donateAmt);
    if (isNaN(amt) || amt <= 0) { doFlash("✗ Invalid amount"); return; }
    setDonating(true);
    const ok = await donateToPool(amt);
    setDonating(false);
    if (ok) {
      setPoolTotal(p => p + amt);
      setShowDonate(false);
      doFlash(`✓ DONATED ${amt} SOL — Thank you!`);
    } else {
      doFlash("✗ Transaction cancelled or failed");
    }
  };

  const handleRecommendation = (action: string) => {
    if (action === "quest") setTab("quest");
    else if (action === "mine") setTab("mine");
    else if (action === "phantom") handleConnect();
    else if (action === "donate") setShowDonate(true);
  };

  const displaySolPrice = solPrice ? `$${solPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "loading...";
  const displaySolChange = solChange !== null ? `${solChange >= 0 ? "+" : ""}${solChange.toFixed(1)}%` : "";

  const tabs = [
    { id: "wallet", icon: "◈", label: "WALLET" },
    { id: "mine", icon: "⛏", label: "MINE" },
    { id: "quest", icon: "◉", label: "QUEST" },
    { id: "learn", icon: "◫", label: "LEARN" },
    { id: "social", icon: "⬡", label: "SOCIAL" },
  ];

  const solBalance = 24.81;
  const solUsd = solPrice ? (solBalance * solPrice) : null;

  const tokens = [
    { icon: "◎", name: "SOL", amount: solBalance.toFixed(2), usd: solUsd ? `$${solUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "...", change: displaySolChange, spark: [10, 15, 12, 18, 20, 18, 24], color: "#00FF41" },
    { icon: "∞", name: "X100", amount: "1,000,000", usd: "∞", change: "∞", spark: [5, 8, 15, 12, 22, 28, 35, 42, 40], color: "#FFB800" },
    { icon: "◈", name: "USDC", amount: "1,886.87", usd: "$1,886.87", change: "+0.0%", spark: [10, 10, 10, 10, 10, 10, 10], color: "#00E5FF" },
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

  const Btn = ({ color = "#00FF41", children, onClick, full = false, disabled = false }: any) => (
    <button onClick={onClick} disabled={disabled}
      className={`px-3 py-2 text-[11px] font-mono tracking-wider transition-all hover:brightness-125 active:scale-95 ${full ? "w-full" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ background: "#000", border: `1px solid ${color}`, color }}>{children}</button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-2 font-mono">
      <div className="relative w-full max-w-[420px] min-h-[90vh] bg-black text-[#00FF41] overflow-hidden rounded-lg border border-[#111]"
        style={{ boxShadow: "0 0 40px rgba(0,255,65,0.05)" }}>
        <MatrixRain />

        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setFlash(null)}>
            <Card><span className="text-sm">{flash}</span></Card>
          </div>
        )}

        {/* Donate Modal */}
        {showDonate && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6" onClick={(e) => { if (e.target === e.currentTarget) setShowDonate(false); }}>
            <Card border="#FFB800" className="w-full max-w-[340px]">
              <div className="text-center mb-4">
                <div className="text-2xl mb-2">💎</div>
                <div className="text-sm font-bold text-[#FFB800]">DONATE TO PROJECT POOL</div>
                <div className="text-[9px] text-gray-600 mt-1">Support X100 development & collaborations</div>
              </div>

              <div className="bg-[#111] p-3 border border-[#222] mb-3">
                <div className="text-[8px] text-gray-600 tracking-widest mb-1">POOL BALANCE</div>
                <div className="text-lg font-bold text-[#00FF41]">{poolTotal.toFixed(2)} SOL</div>
                <div className="text-[9px] text-gray-600">{solPrice ? `≈ $${(poolTotal * solPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ""}</div>
              </div>

              <div className="mb-3">
                <div className="text-[9px] text-gray-600 mb-1">AMOUNT (SOL)</div>
                <div className="flex gap-1.5 mb-2">
                  {["0.1", "0.5", "1", "5"].map(v => (
                    <button key={v} onClick={() => setDonateAmt(v)}
                      className={`flex-1 py-1.5 text-[10px] border transition-all ${donateAmt === v ? "border-[#FFB800] text-[#FFB800] bg-[#FFB80010]" : "border-[#222] text-gray-600 hover:border-[#444]"}`}>
                      {v} SOL
                    </button>
                  ))}
                </div>
                <input type="number" value={donateAmt} onChange={e => setDonateAmt(e.target.value)} step="0.01" min="0.01"
                  className="w-full bg-[#111] border border-[#222] text-sm text-[#FFB800] p-2 text-center font-bold focus:border-[#FFB800] focus:outline-none"
                />
                {solPrice && <div className="text-[9px] text-gray-600 text-center mt-1">≈ ${(parseFloat(donateAmt || "0") * solPrice).toFixed(2)} USD</div>}
              </div>

              <Btn onClick={handleDonate} full color="#FFB800" disabled={donating}>
                {donating ? "⏳ CONFIRMING IN PHANTOM..." : `💎 DONATE ${donateAmt} SOL`}
              </Btn>
              <button onClick={() => setShowDonate(false)} className="w-full text-[10px] text-gray-600 mt-2 hover:text-gray-400 py-1">Cancel</button>

              <div className="mt-3 text-[8px] text-gray-700 text-center">
                Pool wallet: {PROJECT_WALLET.slice(0, 8)}...{PROJECT_WALLET.slice(-4)}
              </div>
            </Card>
          </div>
        )}

        {/* ─── Status Bar ─────────────────────────── */}
        <div className="relative z-10 px-4 py-2 flex justify-between items-center text-[10px] border-b border-[#111]">
          {walletAddr ? (
            <span className="text-[#00FF41]" title={walletAddr}>● {walletAddr.slice(0,4)}...{walletAddr.slice(-4)}</span>
          ) : (
            <button onClick={handleConnect} className="text-[#7B2FFF] hover:text-[#9B5FFF] transition-colors">
              ○ CONNECT WALLET
            </button>
          )}
          <span className="text-gray-600">X100 OASIS v3.1</span>
          <span className="text-[#FFB800]">SOL: {displaySolPrice}</span>
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
                <div className="text-4xl font-bold" style={{ textShadow: "0 0 10px rgba(0,255,65,0.6)" }}>
                  {solUsd ? `$${(solUsd + 1886.87).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "..."}
                  <span className="text-lg">.{solUsd ? ((solUsd + 1886.87) % 1).toFixed(2).slice(2) : "00"}</span>
                </div>
                <div className="text-[11px] text-[#00FF41] mt-1">{displaySolChange} (SOL 24h) · Live from CoinGecko</div>
              </div>

              {/* Tokens */}
              {tokens.map(t => (
                <Card key={t.name} border={t.name === "X100" ? "#FFB800" : "#00FF41"}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xl ${t.name === "X100" ? "text-[#FFB800]" : ""}`}
                      style={t.name === "X100" ? { textShadow: "0 0 8px rgba(255,184,0,0.5)" } : {}}>
                      {t.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="text-xs font-bold" style={t.name === "X100" ? { color: "#FFB800" } : {}}>{t.name}</span>
                        <span className="text-xs font-bold">{t.amount}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>{t.usd}</span>
                        <span style={{ color: t.name === "X100" ? "#FFB800" : "#00FF41" }}>{t.change}</span>
                      </div>
                    </div>
                    <Spark data={t.spark} color={t.color} />
                  </div>
                </Card>
              ))}

              {/* Quick Actions — REAL */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Btn onClick={handleConnect} full color="#7B2FFF">
                  {walletAddr ? "✓ LINKED" : "👻 PHANTOM"}
                </Btn>
                <Btn onClick={() => swapViaPhantom()} full color="#FFB800">
                  ⚡ SWAP
                </Btn>
                <Btn onClick={() => setShowDonate(true)} full color="#00E5FF">
                  💎 DONATE
                </Btn>
              </div>

              {/* Donate Pool Status */}
              <Card border="#FFB800" className="mt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-gray-600 tracking-widest">PROJECT POOL</div>
                    <div className="text-sm font-bold text-[#FFB800]">{poolTotal.toFixed(2)} SOL</div>
                    {solPrice && <div className="text-[9px] text-gray-600">≈ ${(poolTotal * solPrice).toFixed(0)}</div>}
                  </div>
                  <button onClick={() => setShowDonate(true)}
                    className="px-3 py-2 text-[10px] border border-[#FFB800] text-[#FFB800] hover:bg-[#FFB80010] transition-all">
                    💎 CONTRIBUTE
                  </button>
                </div>
                <div className="text-[8px] text-gray-700 mt-2">For improvements, collaborations & ecosystem growth</div>
              </Card>

              {/* Realms */}
              <div className="mt-3">
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">REALMS / CHARACTER STATS</div>
                {realms.map(r => <PixelBar key={r.label} value={r.val} color={r.color} label={r.label} />)}
              </div>
            </div>
          )}

          {/* ════════════ MINE TAB ════════════ */}
          {tab === "mine" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">X100 MINING · PROOF OF GROWTH</div>

              <Card border="#FFB800">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold text-[#FFB800]" style={{ textShadow: "0 0 10px rgba(255,184,0,0.4)" }}>⛏ MINING</div>
                  <div className="text-[10px] text-gray-500 mt-1">Earn X100 tokens through real self-improvement</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: "TOTAL SUPPLY", value: "21,000,000", color: "#FFB800" },
                    { label: "MINED", value: (MINING.mined + blockCount - 257200).toLocaleString(), color: "#00FF41" },
                    { label: "BLOCK REWARD", value: `${MINING.blockReward} X100`, color: "#00E5FF" },
                    { label: "CURRENT BLOCK", value: `#${blockCount.toLocaleString()}`, color: "#7B2FFF" },
                  ].map(s => (
                    <div key={s.label} className="bg-[#111] p-2 border border-[#222]">
                      <div className="text-[8px] text-gray-600 tracking-widest">{s.label}</div>
                      <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">SUPPLY PROGRESS</div>
                <div className="h-3 bg-[#111] border border-[#222] rounded-sm overflow-hidden mb-1">
                  <div className="h-full" style={{ width: `${(MINING.mined / MINING.totalSupply) * 100}%`, background: "linear-gradient(90deg, #FFB800, #00FF41)" }} />
                </div>
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>{((MINING.mined / MINING.totalSupply) * 100).toFixed(1)}% mined</span>
                  <span>{(MINING.totalSupply - MINING.mined).toLocaleString()} remaining</span>
                </div>
              </Card>

              <Card border="#FFB800">
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">⚡ HALVING SCHEDULE (like Bitcoin)</div>
                <div className="space-y-1.5">
                  {MINING.halvings.map(h => (
                    <div key={h.era} className="flex items-center gap-2 text-[10px]" style={{ opacity: h.status === "future" ? 0.5 : 1 }}>
                      <span className={`w-5 text-center ${h.status === "active" ? "text-[#FFB800]" : h.status === "done" ? "text-[#00FF41]" : "text-gray-700"}`}>
                        {h.status === "done" ? "✓" : h.status === "active" ? "►" : "○"}
                      </span>
                      <span className="w-14 text-gray-500">Era {h.era}</span>
                      <span className="flex-1 text-gray-400">{h.blocks}</span>
                      <span style={{ color: h.status === "active" ? "#FFB800" : h.status === "done" ? "#00FF41" : "#444" }}>{h.reward} X100</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-[#FFB80008] border border-[#FFB80030] text-center">
                  <div className="text-[8px] text-gray-600 tracking-widest">NEXT HALVING IN</div>
                  <div className="text-lg font-bold text-[#FFB800]">{MINING.nextHalving.toLocaleString()} blocks</div>
                  <div className="text-[9px] text-gray-600">Reward: 100 → 50 X100</div>
                </div>
              </Card>

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
                <div className="mt-3 text-[9px] text-gray-600 text-center">Proof of Growth — невозможно нафармить ботами</div>
              </Card>

              <Card border="#7B2FFF">
                <div className="text-[9px] text-[#7B2FFF] tracking-widest mb-2">DAO PROFIT DISTRIBUTION</div>
                {[
                  { label: "Members", pct: 40, color: "#00FF41" },
                  { label: "Treasury", pct: 30, color: "#00E5FF" },
                  { label: "Dev Fund", pct: 20, color: "#FFB800" },
                  { label: "Burn 🔥", pct: 10, color: "#FD79A8" },
                ].map(d => (
                  <div key={d.label} className="mb-1.5">
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-gray-400">{d.label}</span>
                      <span style={{ color: d.color }}>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#111]">
                      <div className="h-full" style={{ width: `${d.pct}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ════════════ QUEST TAB ════════════ */}
          {tab === "quest" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">DAILY QUEST · DAY 14</div>

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
                <Btn onClick={() => doFlash("✓ QUEST COMPLETED +100 X100")} full color="#00E5FF">COMPLETE QUEST →</Btn>
              </Card>

              <Card border="#7B2FFF">
                <div className="flex items-center gap-2 mb-2">
                  <span>⚡</span>
                  <span className="text-[10px] text-[#7B2FFF] tracking-widest">SIDE QUEST</span>
                  <span className="text-[10px] text-gray-600">+{quests[0].sideXp} X100</span>
                </div>
                <p className="text-[11px] text-gray-400">{quests[0].side}</p>
                <Btn onClick={() => doFlash("✓ SIDE QUEST +50 X100")} full color="#7B2FFF">COMPLETE</Btn>
              </Card>

              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">📔 DAILY JOURNAL · +60 X100</div>
                <div className="mb-2">
                  <div className="text-[9px] text-gray-600 mb-1">Morning Check-in</div>
                  <textarea className="w-full bg-[#111] border border-[#222] text-[11px] text-gray-300 p-2 resize-none focus:border-[#00FF41] focus:outline-none" rows={2} placeholder="Как ты себя чувствуешь?.." />
                </div>
                <div className="mb-2">
                  <div className="text-[9px] text-gray-600 mb-1">Evening Review</div>
                  <textarea className="w-full bg-[#111] border border-[#222] text-[11px] text-gray-300 p-2 resize-none focus:border-[#00FF41] focus:outline-none" rows={2} placeholder="Что удалось? 1 урок дня..." />
                </div>
                <Btn onClick={() => doFlash("✓ JOURNAL SAVED +60 X100")} full>SAVE ENTRY</Btn>
              </Card>

              <Card border="#FD79A8">
                <div className="text-[9px] text-[#FD79A8] tracking-widest mb-2">🫁 ДЫХАНИЕ · ПРАКТИКА 4-2-6</div>
                <div className="text-center py-3">
                  <div className="text-3xl mb-2">🫁</div>
                  <div className="text-[11px] text-gray-400">Вдох на 4 · Пауза на 2 · Выдох на 6</div>
                </div>
                <Btn onClick={() => doFlash("✓ BREATHING +20 X100")} full color="#FD79A8">START SESSION</Btn>
              </Card>
            </div>
          )}

          {/* ════════════ LEARN TAB ════════════ */}
          {tab === "learn" && (
            <div>
              <div className="text-[9px] text-gray-600 tracking-widest mb-3">LEARN · ARTICLES · RECOMMENDATIONS</div>

              <Card border="#00E5FF">
                <div className="text-[9px] text-[#00E5FF] tracking-widest mb-2">🌟 RECOMMENDED FOR YOU</div>
                <div className="space-y-2">
                  {RECOMMENDATIONS.map(r => (
                    <button key={r.title} onClick={() => handleRecommendation(r.action)}
                      className="w-full text-left flex items-center gap-3 p-2 bg-[#111] border border-[#222] hover:border-[#444] transition-all active:scale-[0.98]">
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

              <Card border="#FFB800">
                <div className="text-[9px] text-[#FFB800] tracking-widest mb-2">📚 ARTICLES & RESOURCES</div>
                <div className="space-y-1.5">
                  {ARTICLES.map(a => (
                    <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-[#111] border border-[#222] hover:border-[#444] transition-all group active:scale-[0.98]">
                      <span className="text-[8px] px-1.5 py-0.5 font-bold tracking-wider shrink-0"
                        style={{ background: a.color + "15", color: a.color, border: `1px solid ${a.color}40` }}>{a.tag}</span>
                      <span className="flex-1 text-[10px] text-gray-300 group-hover:text-white transition-colors truncate">{a.title}</span>
                      <span className="text-[10px] text-gray-700 group-hover:text-gray-400 shrink-0">↗</span>
                    </a>
                  ))}
                </div>
              </Card>

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
                      {m.status === "done" ? "✓" : m.status === "active" ? "►" : "○"}</span>
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

              <Card>
                <div className="text-[9px] text-gray-600 tracking-widest mb-2">ACTIVITY FEED</div>
                {[
                  { msg: "N1RV_SOL completed Sprint 5 🏆", time: "2m", color: "#FFB800" },
                  { msg: "K1TB_X mined 500 X100 via quest", time: "15m", color: "#00FF41" },
                  { msg: "SOL_ALCH shared diary entry", time: "1h", color: "#00E5FF" },
                  { msg: "PROX_AI started Shadow Work module", time: "2h", color: "#7B2FFF" },
                  { msg: "ZENITH hit 30-day streak! 🔥", time: "4h", color: "#FD79A8" },
                  { msg: "Pool donation: +2.5 SOL 💎", time: "5h", color: "#FFB800" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] py-1.5 border-b border-[#0a0a0a]">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 text-gray-400">{e.msg}</span>
                    <span className="text-gray-700 text-[9px]">{e.time}</span>
                  </div>
                ))}
              </Card>

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
                className="flex-1 py-3 flex flex-col items-center gap-1 transition-all active:scale-90"
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
