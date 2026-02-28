'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')

interface Agent {
  id: string; name: string; role: string; archetype: string
  karma: number; xp: number; bond: number; color: string; icon: string
}

interface Message {
  id: string; role: 'user' | 'agent' | 'tool'; agentId?: string; agentName?: string
  content: string; streaming?: boolean; ts: number; toolName?: string
}

const AGENTS: Agent[] = [
  { id: 'godlocal', name: 'GodLocal', role: 'Проводник', archetype: 'conductor', karma: 6, xp: 10, bond: 22, color: '#00FF9D', icon: '⚡' },
  { id: 'architect', name: 'Architect', role: 'Стратег', archetype: 'strategist', karma: 4, xp: 8, bond: 18, color: '#6C5CE7', icon: '🏛' },
  { id: 'builder', name: 'Builder', role: 'Создатель', archetype: 'creator', karma: 3, xp: 5, bond: 21, color: '#00B4D8', icon: '🔨' },
  { id: 'grok', name: 'Grok', role: 'Аналитик', archetype: 'grok', karma: 5, xp: 7, bond: 15, color: '#FD79A8', icon: '🧠' },
  { id: 'lucas', name: 'Lucas', role: 'Философ', archetype: 'lucas', karma: 4, xp: 6, bond: 14, color: '#FDCB6E', icon: '💡' },
  { id: 'harper', name: 'Harper', role: 'Исследователь', archetype: 'harper', karma: 3, xp: 4, bond: 12, color: '#E17055', icon: '🔬' },
  { id: 'benjamin', name: 'Benjamin', role: 'Хранитель', archetype: 'benjamin', karma: 5, xp: 9, bond: 20, color: '#55EFC4', icon: '📚' },
]

const QUICK_PROMPTS = [
  'Что происходит с Bitcoin сегодня?',
  'Что такое GodLocal?',
  'Последние AI новости 2026',
  'Стратегия для запуска продукта',
]

const TOOL_LABELS: Record<string, string> = {
  web_search: '🌐 Ищу в интернете',
  get_market_data: '📊 Загружаю рынок',
  get_system_status: '⚙️ Статус системы',
  add_spark: '⚡ SparkNet',
}


// ─── Markdown renderer (no deps) ──────────────────────────────────
function MarkdownText({ text, streaming }: { text: string; streaming?: boolean }) {
  // Process markdown into React nodes
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []

  lines.forEach((line, li) => {
    if (!line && li < lines.length - 1) { nodes.push(<br key={`br-${li}`} />); return }

    // Parse inline: **bold**, `code`, [text](url)
    const parts: React.ReactNode[] = []
    let rest = line
    let ki = 0

    while (rest.length) {
      // Bold
      const boldM = rest.match(/^(.*?)\*\*(.*?)\*\*(.*)$/)
      if (boldM) {
        if (boldM[1]) parts.push(<span key={ki++}>{boldM[1]}</span>)
        parts.push(<strong key={ki++} className="text-gray-100 font-semibold">{boldM[2]}</strong>)
        rest = boldM[3]; continue
      }
      // Link [text](url)
      const linkM = rest.match(/^(.*?)\[([^\]]+)\]\((https?:\/\/[^)]+)\)(.*)$/)
      if (linkM) {
        if (linkM[1]) parts.push(<span key={ki++}>{linkM[1]}</span>)
        parts.push(
          <a key={ki++} href={linkM[3]} target="_blank" rel="noopener noreferrer"
            className="text-[#00FF9D] underline underline-offset-2 hover:text-white transition-colors break-all">
            {linkM[2]} ↗
          </a>
        )
        rest = linkM[4]; continue
      }
      // Inline code
      const codeM = rest.match(/^(.*?)`([^`]+)`(.*)$/)
      if (codeM) {
        if (codeM[1]) parts.push(<span key={ki++}>{codeM[1]}</span>)
        parts.push(<code key={ki++} className="bg-[#0f1a1a] text-[#00FF9D] px-1.5 py-0.5 rounded text-xs font-mono">{codeM[2]}</code>)
        rest = codeM[3]; continue
      }
      // Plain URL (not in markdown link format)
      const urlM = rest.match(/^(.*?)(https?:\/\/[^\s<>]+)(.*)$/)
      if (urlM) {
        if (urlM[1]) parts.push(<span key={ki++}>{urlM[1]}</span>)
        const url = urlM[2]
        const label = url.replace(/^https?:\/\//, '').slice(0, 40) + (url.length > 45 ? '...' : '')
        parts.push(
          <a key={ki++} href={url} target="_blank" rel="noopener noreferrer"
            className="text-[#00FF9D] underline underline-offset-2 hover:text-white transition-colors">
            {label} ↗
          </a>
        )
        rest = urlM[3]; continue
      }
      parts.push(<span key={ki++}>{rest}</span>)
      break
    }

    // Heading
    if (line.startsWith('### ')) {
      nodes.push(<div key={li} className="font-bold text-gray-100 mt-2 mb-0.5 text-sm">{parts}</div>)
    } else if (line.startsWith('## ')) {
      nodes.push(<div key={li} className="font-bold text-gray-100 mt-2 mb-0.5">{parts}</div>)
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      nodes.push(<div key={li} className="flex gap-2 items-start"><span className="text-gray-600 shrink-0 mt-0.5">·</span><span>{parts}</span></div>)
    } else {
      nodes.push(<span key={li}>{parts}</span>)
      if (li < lines.length - 1) nodes.push(<br key={`br-${li}`} />)
    }
  })

  return (
    <span>
      {nodes}
      {streaming && <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm opacity-70 align-middle" />}
    </span>
  )
}
// ──────────────────────────────────────────────────────────────────

export default function OasisPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0])
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showAgents, setShowAgents] = useState(false)
  const [stats, setStats] = useState<Record<string, {xp:number,bond:number,karma:number}>>(
    Object.fromEntries(AGENTS.map(a => [a.id, {xp:a.xp,bond:a.bond,karma:a.karma}]))
  )
  const [sessionId] = useState(() => Math.random().toString(36).slice(2,10))
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setConnecting(true)
    const ws = new WebSocket(`${WS_BASE}/ws/oasis?sid=${sessionId}`)
    wsRef.current = ws
    ws.onopen = () => { setConnected(true); setConnecting(false) }
    ws.onmessage = (e) => { try { handleMsg(JSON.parse(e.data)) } catch {} }
    ws.onclose = () => {
      setConnected(false); setConnecting(false)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(connectWS, 4000)
    }
    ws.onerror = () => { setConnected(false); setConnecting(false) }
  }, [sessionId])

  useEffect(() => { connectWS(); return () => { wsRef.current?.close(); if (reconnectTimer.current) clearTimeout(reconnectTimer.current) } }, [connectWS])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleMsg = (data: any) => {
    const t = data.t || data.type
    if (t === 'token') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming && last.agentId === 'godlocal') {
          return [...prev.slice(0, -1), { ...last, content: last.content + (data.v || '') }]
        }
        return [...prev, { id: rand(), role: 'agent', agentId: 'godlocal', agentName: 'GodLocal', content: data.v || '', streaming: true, ts: Date.now() }]
      })
    }
    if (t === 'arch_reply' || t === 'agent_reply') {
      const agentId = (data.agent || 'godlocal').toLowerCase()
      const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0]
      setMessages(prev => [...prev, { id: rand(), role: 'agent', agentId, agentName: agent.name, content: data.v || data.reply || '', streaming: false, ts: Date.now() }])
      setStats(p => ({ ...p, [agentId]: { ...p[agentId], xp: (p[agentId]?.xp||0) + 1 } }))
    }
    if (t === 'done' || t === 'session_done') {
      setMessages(prev => prev.map(m => ({ ...m, streaming: false })))
    }
    if (t === 'tool') {
      const label = TOOL_LABELS[data.n] || `🔧 ${data.n}`
      setMessages(prev => [...prev, { id: rand(), role: 'tool', content: `${label}${data.q ? ': ' + data.q : ''}`, toolName: data.n, ts: Date.now() }])
    }
    if (t === 'error') {
      setMessages(prev => [...prev, { id: rand(), role: 'tool', content: `❌ ${data.v || 'Error'}`, ts: Date.now() }])
    }
  }

  const rand = () => Math.random().toString(36).slice(2)

  const send = () => {
    const text = input.trim()
    if (!text || !wsRef.current) return
    setMessages(prev => [...prev, { id: rand(), role: 'user', content: text, ts: Date.now() }])
    setInput('')
    setShowAgents(false)
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ prompt: text, session_id: sessionId, agent: activeAgent.id }))
    } else {
      connectWS()
    }
    setStats(p => ({ ...p, [activeAgent.id]: { ...p[activeAgent.id], bond: (p[activeAgent.id]?.bond||0) + 1 } }))
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div className="flex flex-col bg-[#030508] text-gray-200" style={{ height: '100dvh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#0f1520] bg-[#030508]" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center gap-2">
          <a href="/" className="text-gray-600 hover:text-gray-400 p-1 -ml-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </a>
          <span className="text-[#00FF9D] font-bold tracking-widest text-sm">OASIS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${connected ? 'bg-[#00FF9D]/10 text-[#00FF9D]' : 'bg-gray-800 text-gray-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#00FF9D] animate-pulse' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'live' : connecting ? '...' : 'off'}
          </div>
          {/* Agent selector button */}
          <button onClick={() => setShowAgents(!showAgents)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all"
            style={{ borderColor: activeAgent.color + '50', background: activeAgent.color + '12', color: activeAgent.color }}>
            <span>{activeAgent.icon}</span>
            <span className="font-medium hidden sm:block">{activeAgent.name}</span>
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      {/* Agent picker dropdown */}
      <AnimatePresence>
        {showAgents && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="shrink-0 border-b border-[#0f1520] bg-[#040609] px-3 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {AGENTS.map(a => {
                const s = stats[a.id] || a
                const isActive = activeAgent.id === a.id
                return (
                  <button key={a.id} onClick={() => { setActiveAgent(a); setShowAgents(false) }}
                    className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all min-w-[70px]"
                    style={{ borderColor: isActive ? a.color + '80' : '#1a2030', background: isActive ? a.color + '18' : 'transparent' }}>
                    <span className="text-xl mb-0.5">{a.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: isActive ? a.color : '#9ca3af' }}>{a.name}</span>
                    <span className="text-gray-600" style={{ fontSize: 10 }}>{s.xp} xp</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ overscrollBehavior: 'contain' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 py-8">
            <div className="text-5xl">⚡</div>
            <div className="text-center">
              <div className="text-[#00FF9D] font-bold text-lg tracking-widest mb-1">OASIS</div>
              <div className="text-gray-600 text-sm">7 агентов · живой поиск · память сессии</div>
            </div>
            <div className="w-full max-w-sm space-y-2">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 50) }}
                  className="w-full text-left text-sm px-4 py-2.5 bg-[#080d14] border border-[#0f1820] rounded-2xl text-gray-500 hover:text-gray-300 active:bg-[#0f1a24] transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const agent = AGENTS.find(a => a.id === msg.agentId)

            if (msg.role === 'user') return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end mb-3">
                <div className="max-w-[82%] bg-[#6C5CE7]/20 border border-[#6C5CE7]/30 rounded-2xl rounded-br-md px-4 py-3 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </motion.div>
            )

            if (msg.role === 'tool') return (
              <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mb-2">
                <span className="text-xs text-yellow-600/70 font-mono bg-[#0a0e14] px-3 py-1 rounded-full border border-yellow-900/20 max-w-[90%] truncate">
                  {msg.content}
                </span>
              </motion.div>
            )

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 mb-4 items-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm border"
                  style={{ background: (agent?.color || '#00FF9D') + '15', borderColor: (agent?.color || '#00FF9D') + '40' }}>
                  {agent?.icon || '⚡'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs mb-1 font-medium" style={{ color: agent?.color || '#00FF9D' }}>
                    {msg.agentName || 'GodLocal'}
                  </div>
                  <div className="bg-[#080d14] border border-[#0f1820] rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-300 leading-relaxed break-words">
                    <MarkdownText text={msg.content} streaming={msg.streaming} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Stats bar (minimal) */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-t border-[#0a0f18] bg-[#040609] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {['karma','xp','bond'].map(key => {
          const val = stats[activeAgent.id]?.[key as keyof typeof stats[string]] || activeAgent[key as keyof Agent]
          return (
            <div key={key} className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-700 uppercase tracking-wider" style={{ fontSize: 10 }}>{key}</span>
              <span className="font-mono text-xs font-bold" style={{ color: activeAgent.color }}>{typeof val === 'number' ? Math.round(val) : val}</span>
            </div>
          )
        })}
        <div className="ml-auto shrink-0 h-1 w-16 bg-[#0f1520] rounded-full overflow-hidden">
          <div className="h-1 rounded-full" style={{ width: `${Math.min((stats[activeAgent.id]?.xp||activeAgent.xp) * 5, 100)}%`, background: activeAgent.color }} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-3 bg-[#030508]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="flex items-end gap-2 bg-[#080d14] border border-[#0f1820] rounded-2xl px-3 py-2.5 focus-within:border-[#1a2535] transition-colors">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
            placeholder={`Спроси ${activeAgent.name}...`}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-200 placeholder-gray-700 leading-relaxed"
            rows={1} style={{ maxHeight: 120, overflowY: 'auto' }}
            onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }} />
          <button onClick={send} disabled={!input.trim()}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
            style={{ background: activeAgent.color }}>
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
