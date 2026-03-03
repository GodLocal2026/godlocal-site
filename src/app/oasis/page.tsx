'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')

interface Agent {
  id: string
  name: string
  role: string
  archetype: string
  karma: number
  xp: number
  bond: number
  color: string
  icon: string
}

interface Message {
  id: string
  role: 'user' | 'agent'
  agentId?: string
  agentName?: string
  content: string
  streaming?: boolean
  ts: number
  tool?: string
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
  'Что такое GodLocal?',
  'Цена Bitcoin?',
  'Создай стратегию для запуска AI-продукта',
  'Объясни квантовые вычисления просто',
]

export default function OasisPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0])
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [agentStats, setAgentStats] = useState<Record<string, Agent>>(
    Object.fromEntries(AGENTS.map(a => [a.id, { ...a }]))
  )
  const [soulMemory, setSoulMemory] = useState<string[]>([])
  const [sessionId] = useState(() => Math.random().toString(36).slice(2))
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setConnecting(true)
    const ws = new WebSocket(`${WS_BASE}/ws/oasis?sid=${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setConnecting(false)
      addSystemMessage('✅ Подключено к Oasis. 7 агентов готовы.')
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        handleWsMessage(data)
      } catch {}
    }

    ws.onclose = () => {
      setConnected(false)
      setConnecting(false)
      setTimeout(connectWS, 3000)
    }

    ws.onerror = () => {
      setConnected(false)
      setConnecting(false)
    }
  }, [sessionId])

  useEffect(() => {
    connectWS()
    return () => wsRef.current?.close()
  }, [connectWS])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleWsMessage = (data: any) => {
    const t = data.t || data.type

    if (t === 'agent_token' || t === 'token') {
      const agentId = data.agent?.toLowerCase() || 'godlocal'
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming && last.agentId === agentId) {
          return [...prev.slice(0, -1), { ...last, content: last.content + (data.v || data.token || '') }]
        }
        const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0]
        return [...prev, {
          id: Math.random().toString(36).slice(2),
          role: 'agent', agentId, agentName: agent.name,
          content: data.v || data.token || '', streaming: true, ts: Date.now()
        }]
      })
    }

    if (t === 'agent_reply' || t === 'arch_reply') {
      const agentId = (data.agent || 'godlocal').toLowerCase()
      const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0]
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming && last.agentId === agentId) {
          return [...prev.slice(0, -1), { ...last, content: data.v || data.reply || last.content, streaming: false }]
        }
        return [...prev, {
          id: Math.random().toString(36).slice(2),
          role: 'agent', agentId, agentName: agent.name,
          content: data.v || data.reply || '', streaming: false, ts: Date.now()
        }]
      })
      // boost XP
      setAgentStats(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], xp: (prev[agentId]?.xp || 0) + 1 }
      }))
    }

    if (t === 'arch_start' || t === 'agent_start') {
      const agentId = (data.agent || 'godlocal').toLowerCase()
      setActiveAgent(AGENTS.find(a => a.id === agentId) || AGENTS[0])
    }

    if (t === 'tool_call' || t === 'tool') {
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        role: 'agent', agentId: 'system',
        content: `🔧 ${data.tool || data.name}: ${JSON.stringify(data.args || data.input || '').slice(0, 80)}`,
        tool: data.tool, streaming: false, ts: Date.now()
      }])
    }

    if (t === 'soul_update' || t === 'memory') {
      setSoulMemory(prev => [data.content || data.v || '', ...prev].slice(0, 10))
    }

    if (t === 'session_done' || t === 'done') {
      setMessages(prev => prev.map(m => ({ ...m, streaming: false })))
    }

    if (t === 'error') {
      addSystemMessage(`❌ ${data.v || data.message || 'Error'}`)
    }
  }

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      role: 'agent', agentId: 'system', agentName: 'System',
      content: text, streaming: false, ts: Date.now()
    }])
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !wsRef.current) return

    setMessages(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      role: 'user', content: text, ts: Date.now()
    }])
    setInput('')

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ prompt: text, sid: sessionId, agent: activeAgent.id }))
    } else {
      addSystemMessage('Реконнект...')
      connectWS()
    }

    setAgentStats(prev => ({
      ...prev,
      [activeAgent.id]: {
        ...prev[activeAgent.id],
        bond: (prev[activeAgent.id]?.bond || 0) + 1,
        karma: Math.min((prev[activeAgent.id]?.karma || 0) + 0.1, 10)
      }
    }))
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const agent = (id?: string) => AGENTS.find(a => a.id === id)

  return (
    <div className="min-h-screen bg-[#030508] text-gray-200 flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", monospace' }}>

      {/* Top bar */}
      <div className="border-b border-[#0f1520] px-4 py-3 flex items-center justify-between bg-[#030508]/95 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <a href="/" className="text-gray-700 hover:text-gray-400 text-sm transition-colors">← Home</a>
          <span className="text-gray-800">/</span>
          <span className="text-[#00FF9D] font-bold tracking-widest text-sm">GODLOCAL</span>
          <span className="text-gray-700 text-xs">OASIS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00FF9D] animate-pulse' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600">{connected ? 'live' : connecting ? 'connecting...' : 'offline'}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 53px)' }}>

        {/* Left sidebar — agents */}
        <div className="w-52 border-r border-[#0f1520] flex flex-col bg-[#040609] shrink-0 overflow-y-auto">
          <div className="px-3 py-3">
            <div className="text-xs text-gray-600 font-mono tracking-widest mb-2">АГЕНТЫ</div>
            {AGENTS.map(a => {
              const stats = agentStats[a.id] || a
              const isActive = activeAgent.id === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => setActiveAgent(a)}
                  className={`w-full text-left px-2 py-2 rounded-lg mb-1 transition-all text-xs ${isActive ? 'bg-[#0a1020] border border-opacity-40' : 'hover:bg-[#070c14]'}`}
                  style={isActive ? { borderColor: a.color + '66' } : {}}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{a.icon}</span>
                    <div>
                      <div className="font-semibold" style={{ color: isActive ? a.color : '#9ca3af' }}>{a.name}</div>
                      <div className="text-gray-600" style={{ fontSize: 10 }}>{a.archetype} • {stats.xp} xp</div>
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-1.5 h-0.5 rounded-full bg-[#1a2030]">
                      <div className="h-0.5 rounded-full transition-all" style={{ width: `${Math.min(stats.xp * 10, 100)}%`, background: a.color }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="px-3 py-3 border-t border-[#0f1520] mt-auto">
            <div className="text-xs text-gray-600 font-mono tracking-widest mb-2">ЭВОЛЮЦИЯ</div>
            {[
              { label: 'Карма', value: Math.round(agentStats[activeAgent.id]?.karma || activeAgent.karma), max: 10, color: '#00FF9D' },
              { label: 'Bond', value: agentStats[activeAgent.id]?.bond || activeAgent.bond, max: 50, color: '#6C5CE7' },
              { label: 'XP', value: agentStats[activeAgent.id]?.xp || activeAgent.xp, max: 30, color: activeAgent.color },
            ].map(stat => (
              <div key={stat.label} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">{stat.label}</span>
                  <span style={{ color: stat.color }}>{stat.value}</span>
                </div>
                <div className="h-1 bg-[#0f1520] rounded-full">
                  <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%`, background: stat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
                <div className="text-4xl">⚡</div>
                <div className="text-center">
                  <div className="text-[#00FF9D] font-bold text-xl tracking-widest mb-1">OASIS</div>
                  <div className="text-gray-600 text-sm">7 агентов · WebSocket · SOUL память</div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => { setInput(p); inputRef.current?.focus() }}
                      className="text-left text-xs px-3 py-2 bg-[#080d14] border border-[#0f1820] rounded-xl text-gray-500 hover:text-gray-300 hover:border-[#1a2535] transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const a = agent(msg.agentId)
                if (msg.role === 'user') return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                    <div className="max-w-[75%] bg-[#6C5CE7]/20 border border-[#6C5CE7]/30 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-gray-200 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </motion.div>
                )
                if (msg.agentId === 'system') return (
                  <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                    <span className="text-xs text-gray-700 bg-[#080c12] px-3 py-1 rounded-full border border-[#0f1520]">{msg.content}</span>
                  </motion.div>
                )
                if (msg.tool) return (
                  <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <span className="text-xs text-yellow-600/70 font-mono bg-[#080c12] px-3 py-1 rounded-lg border border-yellow-900/20">{msg.content}</span>
                  </motion.div>
                )
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-start">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs border" style={{ background: (a?.color || '#00FF9D') + '15', borderColor: (a?.color || '#00FF9D') + '40' }}>
                      {a?.icon || '⚡'}
                    </div>
                    <div className="max-w-[80%]">
                      <div className="text-xs mb-1 font-medium" style={{ color: a?.color || '#00FF9D' }}>{msg.agentName || 'GodLocal'}</div>
                      <div className={`bg-[#080d14] border border-[#0f1820] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap ${msg.streaming ? 'border-opacity-60' : ''}`}>
                        {msg.content}
                        {msg.streaming && <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm opacity-70" />}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#0f1520] p-3 bg-[#040609]">
            <div className="flex items-end gap-2 bg-[#080d14] border border-[#0f1820] rounded-2xl px-3 py-2">
              <div className="w-5 h-5 rounded-full shrink-0 mb-1 flex items-center justify-center text-xs" style={{ background: activeAgent.color + '20' }}>
                {activeAgent.icon}
              </div>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Обратись к ${activeAgent.name}...`}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-200 placeholder-gray-700 max-h-32"
                rows={1}
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || !connected}
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: activeAgent.color }}
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-xs text-gray-700">Enter — отправить · Shift+Enter — новая строка</span>
              <span className="text-xs" style={{ color: activeAgent.color + '99' }}>{activeAgent.name} · {activeAgent.archetype}</span>
            </div>
          </div>
        </div>

        {/* Right sidebar — memory */}
        {soulMemory.length > 0 && (
          <div className="w-48 border-l border-[#0f1520] flex flex-col bg-[#040609] shrink-0 overflow-y-auto hidden lg:flex">
            <div className="px-3 py-3">
              <div className="text-xs text-gray-600 font-mono tracking-widest mb-2">ПАМЯТЬ</div>
              {soulMemory.map((m, i) => (
                <div key={i} className="text-xs text-gray-600 bg-[#080c12] rounded-lg px-2 py-1.5 mb-1 leading-relaxed">{m}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
