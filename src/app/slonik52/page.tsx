'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────
interface Token {
  address: string
  symbol: string
  name: string
  price: number
  priceChange1h: number
  priceChange24h: number
  mcap: number
  liquidity: number
  volume24h: number
  buys24h: number
  sells24h: number
  age: number | null
  pairAddress: string
  dexId: string
  imageUrl?: string
  socials: { telegram?: string; twitter?: string; website?: string }
  score: number
  rugScore: number
}

interface MarketCoin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  price_change_percentage_1h_in_currency?: number
  market_cap: number
  total_volume: number
}

interface ChatMsg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  ts: number
}

type Tab = 'scan' | 'analyze' | 'market' | 'wallet' | 'ai'
type MarketCat = 'top' | 'memes' | 'solana'

// ── Constants ────────────────────────────────────────────────────────────────
const DEX = 'https://api.dexscreener.com'
const COINGECKO = 'https://api.coingecko.com/api/v3'
const SOL_RPC = 'https://api.mainnet-beta.solana.com'
const uid = () => Math.random().toString(36).slice(2, 10)

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(n < 1 ? 6 : 2)
}

function timeAgo(ms: number | null): string {
  if (!ms) return '?'
  const h = ms / 3600000
  if (h < 1) return Math.round(h * 60) + 'm'
  if (h < 24) return Math.round(h) + 'h'
  return Math.round(h / 24) + 'd'
}

function tokenScore(p: Record<string, unknown>): number {
  const vol = (p.volume as Record<string, number>)?.h24 || 0
  const liq = (p.liquidity as Record<string, number>)?.usd || 0
  const ch1 = parseFloat(String((p.priceChange as Record<string, number>)?.h1 || 0))
  const buys = (p.txns as Record<string, Record<string, number>>)?.h24?.buys || 0
  const sells = (p.txns as Record<string, Record<string, number>>)?.h24?.sells || 0
  let s = 0
  if (vol > 100000) s += 20; else if (vol > 10000) s += 10
  if (liq > 50000) s += 20; else if (liq > 10000) s += 10
  if (ch1 > 10) s += 15; else if (ch1 > 0) s += 5
  if (buys > sells * 1.5) s += 15; else if (buys > sells) s += 8
  const bp = buys + sells > 0 ? buys / (buys + sells) : 0.5
  if (bp > 0.7) s += 10
  return Math.min(100, s)
}

function rugScore(p: Record<string, unknown>): number {
  const liq = (p.liquidity as Record<string, number>)?.usd || 0
  const buys = (p.txns as Record<string, Record<string, number>>)?.h24?.buys || 0
  const sells = (p.txns as Record<string, Record<string, number>>)?.h24?.sells || 0
  const age = (p as Record<string, number>).pairCreatedAt ? Date.now() - (p as Record<string, number>).pairCreatedAt : null
  const info = p.info as Record<string, unknown> | undefined
  const socials = (info?.socials as Array<Record<string, string>>) || []
  const websites = (info?.websites as Array<unknown>) || []
  const hasTg = socials.some(s => s.type === 'telegram')
  const hasTw = socials.some(s => s.type === 'twitter')
  const hasSite = websites.length > 0
  let r = 0
  if (liq < 5000) r += 30; else if (liq < 20000) r += 12
  if (!hasTg && !hasTw && !hasSite) r += 22
  if (age && age < 1800000) r += 12
  if (buys < 10) r += 15
  if (sells > buys * 3) r += 15
  return Math.min(100, r)
}

function parsePair(p: Record<string, unknown>): Token {
  const bt = p.baseToken as Record<string, string> | undefined
  const info = p.info as Record<string, unknown> | undefined
  const socials = (info?.socials as Array<Record<string, string>>) || []
  const websites = (info?.websites as Array<Record<string, string>>) || []
  const age = (p as Record<string, number>).pairCreatedAt ? Date.now() - (p as Record<string, number>).pairCreatedAt : null
  return {
    address: bt?.address || '',
    symbol: bt?.symbol || '?',
    name: bt?.name || 'Unknown',
    price: parseFloat(String(p.priceUsd || 0)),
    priceChange1h: parseFloat(String((p.priceChange as Record<string, number>)?.h1 || 0)),
    priceChange24h: parseFloat(String((p.priceChange as Record<string, number>)?.h24 || 0)),
    mcap: ((p.fdv || p.marketCap) as number) || 0,
    liquidity: (p.liquidity as Record<string, number>)?.usd || 0,
    volume24h: (p.volume as Record<string, number>)?.h24 || 0,
    buys24h: (p.txns as Record<string, Record<string, number>>)?.h24?.buys || 0,
    sells24h: (p.txns as Record<string, Record<string, number>>)?.h24?.sells || 0,
    age,
    pairAddress: String(p.pairAddress || ''),
    dexId: String(p.dexId || ''),
    imageUrl: (info?.imageUrl as string) || undefined,
    socials: {
      telegram: socials.find(s => s.type === 'telegram')?.url,
      twitter: socials.find(s => s.type === 'twitter')?.url,
      website: websites[0]?.url,
    },
    score: tokenScore(p),
    rugScore: rugScore(p),
  }
}

// ── Rug Meter Component ─────────────────────────────────────────────────────
function RugMeter({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#eab308' : '#22c55e'
  const label = score >= 70 ? 'HIGH RISK' : score >= 40 ? 'CAUTION' : 'LOW RISK'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color }}>{score}% {label}</span>
    </div>
  )
}

// ── Token Card Component ────────────────────────────────────────────────────
function TokenCard({ token, onAnalyze }: { token: Token; onAnalyze: (addr: string) => void }) {
  const sigColor = token.score >= 70 ? '#22c55e' : token.score >= 40 ? '#eab308' : '#6b7280'
  const sigLabel = token.score >= 70 ? '🔥 HOT' : token.score >= 40 ? '⚡ WARM' : '❄️ COLD'
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-emerald-500/20 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {token.imageUrl && <img src={token.imageUrl} className="w-6 h-6 rounded-full" alt="" />}
          <div>
            <span className="font-bold text-sm text-white">{token.symbol}</span>
            <span className="text-[10px] text-gray-500 ml-1.5">{token.name.slice(0, 16)}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: sigColor, background: sigColor + '15' }}>
          {sigLabel}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono mb-2">
        <div><span className="text-gray-600">MCap</span><br /><span className="text-white">${fmt(token.mcap)}</span></div>
        <div><span className="text-gray-600">Liq</span><br /><span className="text-white">${fmt(token.liquidity)}</span></div>
        <div><span className="text-gray-600">Vol 24h</span><br /><span className="text-white">${fmt(token.volume24h)}</span></div>
        <div><span className="text-gray-600">1h</span><br /><span className={token.priceChange1h >= 0 ? 'text-emerald-400' : 'text-red-400'}>{token.priceChange1h > 0 ? '+' : ''}{token.priceChange1h.toFixed(1)}%</span></div>
        <div><span className="text-gray-600">24h</span><br /><span className={token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}>{token.priceChange24h > 0 ? '+' : ''}{token.priceChange24h.toFixed(1)}%</span></div>
        <div><span className="text-gray-600">Age</span><br /><span className="text-white">{timeAgo(token.age)}</span></div>
      </div>
      <div className="flex items-center justify-between">
        <RugMeter score={token.rugScore} />
        <button onClick={() => onAnalyze(token.address)}
          className="text-[10px] font-mono text-emerald-400/70 hover:text-emerald-300 transition-colors">
          ANALYZE →
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function Slonik52Page() {
  const [tab, setTab] = useState<Tab>('scan')
  const [tokens, setTokens] = useState<Token[]>([])
  const [scanning, setScanning] = useState(false)
  const [analyzeAddr, setAnalyzeAddr] = useState('')
  const [analyzeResult, setAnalyzeResult] = useState<Token | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [marketCoins, setMarketCoins] = useState<MarketCoin[]>([])
  const [marketCat, setMarketCat] = useState<MarketCat>('top')
  const [marketLoading, setMarketLoading] = useState(false)
  const [walletAddr, setWalletAddr] = useState<string | null>(null)
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { id: uid(), role: 'system', content: '🐘 **slonik52 AI** — your crypto analysis assistant.\n\nTry: "scan hot tokens", "analyze [address]", "market overview", "what\'s pumping?"', ts: Date.now() }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const [holders, setHolders] = useState<Array<{addr: string; pct: number; isTop: boolean}>>([])

  // ── Scanner ───────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    setScanning(true)
    try {
      const [boost, prof] = await Promise.all([
        fetch(DEX + '/token-boosts/latest/v1').then(r => r.json()).catch(() => []),
        fetch(DEX + '/token-profiles/latest/v1').then(r => r.json()).catch(() => []),
      ])
      const search = await fetch(DEX + '/latest/dex/search?q=solana&rankBy=trendingScoreH6&order=desc').then(r => r.json()).catch(() => ({ pairs: [] }))
      const boosts = (Array.isArray(boost) ? boost : []).filter((b: Record<string, string>) => b.chainId === 'solana').slice(0, 10)
      const profiles = (Array.isArray(prof) ? prof : []).filter((b: Record<string, string>) => b.chainId === 'solana').slice(0, 8)
      const addrs = [...new Set([...boosts.map((b: Record<string, string>) => b.tokenAddress), ...profiles.map((p: Record<string, string>) => p.tokenAddress)])].slice(0, 14)
      let pairs: Record<string, unknown>[] = []
      if (addrs.length) {
        const r = await fetch(DEX + '/latest/dex/tokens/' + addrs.join(',')).then(x => x.json())
        pairs = ((r.pairs || []) as Record<string, unknown>[]).filter((p: Record<string, string>) => p.chainId === 'solana')
      }
      const sp = ((search.pairs || []) as Record<string, unknown>[]).filter((p: Record<string, string>) => p.chainId === 'solana').slice(0, 8)
      const seen = new Set<string>()
      const all = [...pairs, ...sp].filter(p => {
        const bt = p.baseToken as Record<string, string> | undefined
        const a = bt?.address
        if (!a || seen.has(a)) return false
        seen.add(a)
        return true
      })
      all.sort((a, b) => tokenScore(b) - tokenScore(a))
      setTokens(all.map(parsePair))
    } catch (e) {
      console.error('Scan error:', e)
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => { if (tab === 'scan' && tokens.length === 0) runScan() }, [tab, tokens.length, runScan])

  // ── Analyzer ──────────────────────────────────────────────────────────────
  const runAnalyze = useCallback(async (addr: string) => {
    setTab('analyze')
    setAnalyzeAddr(addr)
    setAnalyzing(true)
    setAnalyzeResult(null)
    setHolders([])
    try {
      const dexRes = await fetch(DEX + '/latest/dex/tokens/' + addr).then(x => x.json())
      const pairs = ((dexRes.pairs || []) as Record<string, unknown>[]).filter((p: Record<string, string>) => p.chainId === 'solana')
      if (!pairs.length) { setAnalyzing(false); return }
      const token = parsePair(pairs[0])
      setAnalyzeResult(token)
      // Fetch on-chain holders
      try {
        const holdersRes = await fetch(SOL_RPC, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenLargestAccounts', params: [addr] })
        }).then(r => r.json())
        const accs = (holdersRes.result?.value || []) as Array<Record<string, string>>
        const totalRaw = accs.reduce((s: number, a: Record<string, string>) => s + parseFloat(a.amount || '0'), 0)
        const parsed = accs.slice(0, 10).map((a: Record<string, string>, i: number) => ({
          addr: a.address || '?',
          pct: totalRaw > 0 ? (parseFloat(a.amount || '0') / totalRaw * 100) : 0,
          isTop: i === 0 && totalRaw > 0 && (parseFloat(a.amount || '0') / totalRaw * 100) > 15
        }))
        setHolders(parsed)
      } catch { /* holders optional */ }
    } catch (e) {
      console.error('Analyze error:', e)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  // ── Market ────────────────────────────────────────────────────────────────
  const loadMarket = useCallback(async (cat: MarketCat) => {
    setMarketLoading(true)
    try {
      let url: string
      if (cat === 'top') {
        url = COINGECKO + '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=1h,24h&sparkline=false'
      } else if (cat === 'memes') {
        url = COINGECKO + '/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=50&page=1&price_change_percentage=1h,24h&sparkline=false'
      } else {
        url = COINGECKO + '/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=50&page=1&price_change_percentage=1h,24h&sparkline=false'
      }
      const data = await fetch(url).then(r => r.json())
      if (Array.isArray(data)) setMarketCoins(data)
    } catch (e) {
      console.error('Market error:', e)
    } finally {
      setMarketLoading(false)
    }
  }, [])

  useEffect(() => { if (tab === 'market') loadMarket(marketCat) }, [tab, marketCat, loadMarket])

  // ── Wallet ────────────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    const phantom = (window as Record<string, unknown>).solana || ((window as Record<string, Record<string, unknown>>).phantom)?.solana
    if (!phantom || !(phantom as Record<string, boolean>).isPhantom) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile) {
        const u = encodeURIComponent(window.location.href)
        window.location.href = 'https://phantom.app/ul/browse/' + u + '?ref=' + u
      } else {
        alert('Phantom wallet not found. Install it from phantom.app')
      }
      return
    }
    try {
      const resp = await (phantom as Record<string, (args?: Record<string, boolean>) => Promise<Record<string, { toString: () => string }>>>).connect()
      const addr = resp.publicKey.toString()
      setWalletAddr(addr)
      // Get SOL balance
      const balRes = await fetch(SOL_RPC, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [addr] })
      }).then(r => r.json())
      setSolBalance((balRes.result?.value || 0) / 1e9)
    } catch (e) {
      console.error('Wallet error:', e)
    }
  }, [])

  // ── AI Chat ───────────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatBusy) return
    const userMsg: ChatMsg = { id: uid(), role: 'user', content: chatInput.trim(), ts: Date.now() }
    setChatMsgs(prev => [...prev, userMsg])
    setChatInput('')
    setChatBusy(true)

    const input = userMsg.content.toLowerCase()

    // Local command handling (no API needed)
    let response = ''

    if (input.includes('scan') || input.includes('hot') || input.includes('trending')) {
      response = '🌪️ Running scan for trending Solana tokens...'
      runScan()
      setTimeout(() => {
        const top = tokens.slice(0, 5)
        if (top.length) {
          const list = top.map((t, i) => `${i + 1}. **${t.symbol}** — $${fmt(t.mcap)} MCap, ${t.priceChange1h > 0 ? '+' : ''}${t.priceChange1h.toFixed(1)}% 1h, Score: ${t.score}/100`).join('\n')
          setChatMsgs(prev => [...prev, { id: uid(), role: 'ai', content: `🔥 **Top 5 Trending:**\n\n${list}\n\nSwitch to Scanner tab for full details.`, ts: Date.now() }])
        }
      }, 3000)
    } else if (input.includes('analyze') || input.match(/[A-Za-z0-9]{30,}/)) {
      const addrMatch = input.match(/[A-Za-z0-9]{30,}/)
      if (addrMatch) {
        response = `🔍 Analyzing token \`${addrMatch[0].slice(0, 8)}...\`\nSwitching to Analyze tab...`
        runAnalyze(addrMatch[0])
      } else {
        response = '📝 Paste a Solana token address to analyze.\n\nExample: `analyze EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`'
      }
    } else if (input.includes('market') || input.includes('overview') || input.includes('top coins')) {
      setTab('market')
      response = '📊 Opening Market tab with top coins by market cap.\n\nCategories: **Top 50**, **Memes**, **Solana Ecosystem**'
    } else if (input.includes('help') || input.includes('command')) {
      response = `🐘 **slonik52 Commands:**\n\n• **scan** — find trending Solana tokens\n• **analyze [address]** — deep dive on a token\n• **market** — top coins overview\n• **pump** — latest Pump.fun tokens\n• **risk [address]** — rug score check\n\n💡 Or just ask anything about crypto strategy!`
    } else if (input.includes('pump')) {
      response = '🎰 Fetching latest Pump.fun tokens...'
      try {
        const res = await fetch(DEX + '/latest/dex/search?q=pump.fun&rankBy=trendingScoreH1&order=desc').then(r => r.json())
        const pumpPairs = ((res.pairs || []) as Record<string, unknown>[]).filter((p: Record<string, string>) => p.chainId === 'solana').slice(0, 5)
        if (pumpPairs.length) {
          const list = pumpPairs.map((p, i) => {
            const bt = p.baseToken as Record<string, string>
            const pc = p.priceChange as Record<string, number>
            return `${i + 1}. **${bt?.symbol}** — $${fmt(((p.fdv || p.marketCap) as number) || 0)} MCap, ${(pc?.h1 || 0) > 0 ? '+' : ''}${(pc?.h1 || 0).toFixed(0)}% 1h`
          }).join('\n')
          response = `🎰 **Latest Pump.fun Tokens:**\n\n${list}\n\nUse \`analyze [address]\` for deep dive.`
        } else {
          response = '🎰 No Pump.fun tokens found right now.'
        }
      } catch {
        response = '⚠️ Error fetching Pump.fun data.'
      }
    } else {
      // Generic crypto chat response
      response = `🐘 Good question! Here's what I can do:\n\n• **"scan"** — find trending tokens\n• **"analyze [address]"** — token deep dive\n• **"pump"** — Pump.fun latest\n• **"market"** — top coins\n\nAI-powered analysis coming in Phase 2! For now, I handle commands locally. 🚀`
    }

    if (response) {
      setChatMsgs(prev => [...prev, { id: uid(), role: 'ai', content: response, ts: Date.now() }])
    }
    setChatBusy(false)
  }, [chatInput, chatBusy, runScan, runAnalyze, tokens])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMsgs])

  // ── Tab Config ────────────────────────────────────────────────────────────
  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: 'scan', icon: '🌪️', label: 'Scanner' },
    { key: 'analyze', icon: '🔍', label: 'Analyze' },
    { key: 'market', icon: '📊', label: 'Market' },
    { key: 'wallet', icon: '👻', label: 'Wallet' },
    { key: 'ai', icon: '🐘', label: 'AI' },
  ]

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-dvh flex flex-col bg-[#060612] text-white overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-emerald-500/10 bg-[#060612]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <span className="text-xl">🐘</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">slonik52</h1>
              <p className="text-[10px] text-emerald-400/50 font-mono">AI Crypto Terminal</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {walletAddr && (
            <span className="text-[10px] font-mono text-emerald-400/60 bg-emerald-500/10 px-2 py-1 rounded-lg">
              {walletAddr.slice(0, 4)}…{walletAddr.slice(-4)}
            </span>
          )}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* SCANNER TAB */}
        {tab === 'scan' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white">🌪️ Trending Solana Tokens</h2>
              <button onClick={runScan} disabled={scanning}
                className="text-[10px] font-mono text-emerald-400/70 hover:text-emerald-300 transition-colors disabled:opacity-50">
                {scanning ? '⏳ Scanning...' : '↻ Refresh'}
              </button>
            </div>
            {scanning && tokens.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-3xl mb-3 animate-bounce">🐘</div>
                <p className="text-sm text-gray-500 font-mono">Scanning the blockchain...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map(t => (
                  <TokenCard key={t.address} token={t} onAnalyze={runAnalyze} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYZE TAB */}
        {tab === 'analyze' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text" value={analyzeAddr}
                onChange={e => setAnalyzeAddr(e.target.value)}
                placeholder="Paste Solana token address..."
                className="flex-1 bg-white/[0.04] border border-emerald-500/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/30 font-mono"
              />
              <button onClick={() => analyzeAddr && runAnalyze(analyzeAddr)} disabled={analyzing || !analyzeAddr}
                className="px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                {analyzing ? '⏳' : '🔍'}
              </button>
            </div>

            {analyzing && (
              <div className="text-center py-16">
                <div className="text-3xl mb-3 animate-spin">🔍</div>
                <p className="text-sm text-gray-500 font-mono">Deep analyzing...</p>
              </div>
            )}

            {analyzeResult && !analyzing && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                {/* Token header */}
                <div className="flex items-center gap-3">
                  {analyzeResult.imageUrl && <img src={analyzeResult.imageUrl} className="w-10 h-10 rounded-full" alt="" />}
                  <div>
                    <h3 className="text-lg font-bold text-white">{analyzeResult.symbol}</h3>
                    <p className="text-xs text-gray-500">{analyzeResult.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-mono text-white">${analyzeResult.price < 0.01 ? analyzeResult.price.toExponential(2) : analyzeResult.price.toFixed(4)}</p>
                  </div>
                </div>

                {/* Score + Rug */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Signal Score</p>
                    <p className="text-2xl font-bold" style={{ color: analyzeResult.score >= 70 ? '#22c55e' : analyzeResult.score >= 40 ? '#eab308' : '#6b7280' }}>
                      {analyzeResult.score}
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Rug Risk</p>
                    <p className="text-2xl font-bold" style={{ color: analyzeResult.rugScore >= 70 ? '#ef4444' : analyzeResult.rugScore >= 40 ? '#eab308' : '#22c55e' }}>
                      {analyzeResult.rugScore}%
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">MCap</span><span className="text-white">${fmt(analyzeResult.mcap)}</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">Liquidity</span><span className="text-white">${fmt(analyzeResult.liquidity)}</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">Volume 24h</span><span className="text-white">${fmt(analyzeResult.volume24h)}</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">1h Change</span><span className={analyzeResult.priceChange1h >= 0 ? 'text-emerald-400' : 'text-red-400'}>{analyzeResult.priceChange1h > 0 ? '+' : ''}{analyzeResult.priceChange1h.toFixed(1)}%</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">24h Change</span><span className={analyzeResult.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}>{analyzeResult.priceChange24h > 0 ? '+' : ''}{analyzeResult.priceChange24h.toFixed(1)}%</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">Age</span><span className="text-white">{timeAgo(analyzeResult.age)}</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">Buys 24h</span><span className="text-emerald-400">{analyzeResult.buys24h}</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">Sells 24h</span><span className="text-red-400">{analyzeResult.sells24h}</span></div>
                  <div className="bg-white/[0.02] rounded-lg p-2"><span className="text-gray-600 block">Buy %</span><span className="text-white">{analyzeResult.buys24h + analyzeResult.sells24h > 0 ? Math.round(analyzeResult.buys24h / (analyzeResult.buys24h + analyzeResult.sells24h) * 100) : 50}%</span></div>
                </div>

                {/* Socials */}
                <div className="flex gap-2">
                  {analyzeResult.socials.telegram && <a href={analyzeResult.socials.telegram} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg">Telegram</a>}
                  {analyzeResult.socials.twitter && <a href={analyzeResult.socials.twitter} target="_blank" rel="noreferrer" className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-1 rounded-lg">Twitter</a>}
                  {analyzeResult.socials.website && <a href={analyzeResult.socials.website} target="_blank" rel="noreferrer" className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg">Website</a>}
                  <a href={`https://dexscreener.com/solana/${analyzeResult.address}`} target="_blank" rel="noreferrer" className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg">DexScreener</a>
                </div>

                {/* Holders */}
                {holders.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 mb-2">🔗 Top Holders (on-chain)</h4>
                    <div className="space-y-1">
                      {holders.slice(0, 5).map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-gray-500">{h.addr.slice(0, 8)}…{h.addr.slice(-4)} {h.isTop && <span className="text-red-400 ml-1">⚠️ DEV?</span>}</span>
                          <span className={h.pct > 20 ? 'text-red-400' : h.pct > 10 ? 'text-yellow-400' : 'text-gray-400'}>{h.pct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {!analyzeResult && !analyzing && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm text-gray-500">Paste a token address above to analyze</p>
                <p className="text-[10px] text-gray-700 mt-1">Rug score, holders, signals, socials</p>
              </div>
            )}
          </div>
        )}

        {/* MARKET TAB */}
        {tab === 'market' && (
          <div className="p-4 space-y-3">
            <div className="flex gap-2 mb-3">
              {(['top', 'memes', 'solana'] as MarketCat[]).map(cat => (
                <button key={cat} onClick={() => setMarketCat(cat)}
                  className={`text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all ${marketCat === cat ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.03] text-gray-500 border border-transparent hover:text-gray-400'}`}>
                  {cat === 'top' ? '🏆 Top 50' : cat === 'memes' ? '🎭 Memes' : '◎ Solana'}
                </button>
              ))}
            </div>
            {marketLoading ? (
              <div className="text-center py-16">
                <div className="text-3xl mb-3 animate-pulse">📊</div>
                <p className="text-sm text-gray-500 font-mono">Loading market data...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table header */}
                <div className="grid grid-cols-[32px_1fr_80px_60px_60px] gap-2 px-2 py-1 text-[9px] font-mono text-gray-600">
                  <span>#</span><span>Token</span><span className="text-right">Price</span><span className="text-right">1h</span><span className="text-right">24h</span>
                </div>
                {marketCoins.map((c, i) => (
                  <div key={c.id} className="grid grid-cols-[32px_1fr_80px_60px_60px] gap-2 items-center px-2 py-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-all">
                    <span className="text-[10px] text-gray-600 font-mono">{i + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={c.image} className="w-5 h-5 rounded-full shrink-0" alt="" />
                      <span className="text-xs font-bold text-white truncate">{c.symbol.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white text-right">${c.current_price < 1 ? c.current_price.toFixed(4) : fmt(c.current_price)}</span>
                    <span className={`text-[10px] font-mono text-right ${(c.price_change_percentage_1h_in_currency || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(c.price_change_percentage_1h_in_currency || 0) > 0 ? '+' : ''}{(c.price_change_percentage_1h_in_currency || 0).toFixed(1)}%
                    </span>
                    <span className={`text-[10px] font-mono text-right ${(c.price_change_percentage_24h || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(c.price_change_percentage_24h || 0) > 0 ? '+' : ''}{(c.price_change_percentage_24h || 0).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WALLET TAB */}
        {tab === 'wallet' && (
          <div className="p-4">
            {!walletAddr ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">👻</div>
                <h3 className="text-lg font-bold text-white mb-2">Connect Phantom Wallet</h3>
                <p className="text-xs text-gray-500 mb-6">Connect to view balance, tokens & swap via Jupiter</p>
                <button onClick={connectWallet}
                  className="px-6 py-3 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl text-sm font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all">
                  🔗 Connect Phantom
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-center">
                  <p className="text-[10px] text-gray-500 font-mono mb-1">{walletAddr.slice(0, 8)}…{walletAddr.slice(-8)}</p>
                  <p className="text-3xl font-bold text-white">{solBalance !== null ? solBalance.toFixed(4) : '...'} SOL</p>
                  <p className="text-xs text-gray-500 mt-1">◎ Solana Mainnet</p>
                </div>
                {/* Jupiter Swap Widget */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">⚡ Quick Swap</h4>
                  <p className="text-xs text-gray-500 mb-3">Swap via Jupiter — best rates on Solana</p>
                  <a href="https://jup.ag/" target="_blank" rel="noreferrer"
                    className="block w-full py-3 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-center text-sm font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all">
                    Open Jupiter ↗
                  </a>
                </div>
                <button onClick={() => { setWalletAddr(null); setSolBalance(null) }}
                  className="w-full py-2 text-xs text-gray-600 hover:text-red-400 transition-colors font-mono">
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI CHAT TAB */}
        {tab === 'ai' && (
          <div className="flex flex-col h-full">
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100dvh - 180px)' }}>
              {chatMsgs.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/15'
                      : msg.role === 'system'
                        ? 'bg-white/[0.03] text-gray-400 border border-white/[0.05]'
                        : 'bg-white/[0.05] text-gray-200 border border-white/[0.06]'
                  }`}>
                    <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.06);padding:1px 4px;border-radius:4px;font-size:10px">$1</code>').replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
              ))}
              {chatBusy && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/[0.05]">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-400/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-400/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 p-3 border-t border-emerald-500/10 bg-[#060612]/95 backdrop-blur-xl">
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder="Ask about crypto..."
                  className="flex-1 bg-white/[0.04] border border-emerald-500/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/25 font-mono" />
                <button onClick={sendChat} disabled={chatBusy || !chatInput.trim()}
                  className="px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50">
                  🐘
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Tabs ─────────────────────────────────────────────────── */}
      <nav className="shrink-0 flex justify-around items-center px-2 py-2 border-t border-emerald-500/10 bg-[#060612]/95 backdrop-blur-xl"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
              tab === t.key ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'
            }`}>
            <span className="text-lg">{t.icon}</span>
            <span className={`text-[9px] font-mono ${tab === t.key ? 'text-emerald-400' : 'text-gray-600'}`}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
