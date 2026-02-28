'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE  = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agent { id:string; name:string; role:string; color:string; icon:string }
interface Message {
  id:string; role:'user'|'agent'|'tool'; agentId?:string; agentName?:string
  content:string; streaming?:boolean; ts:number; files?: AttachedFile[]
}
interface AttachedFile { name:string; url:string; type:string; size:number }
interface ServiceStatus { id:string; name:string; icon:string; connected:boolean; color:string }

// ─── Constants ────────────────────────────────────────────────────────────────
const AGENTS: Agent[] = [
  { id:'godlocal',   name:'GodLocal',   role:'Проводник',    color:'#00FF9D', icon:'⚡' },
  { id:'architect',  name:'Architect',  role:'Стратег',      color:'#6C5CE7', icon:'🏛' },
  { id:'builder',    name:'Builder',    role:'Создатель',    color:'#00B4D8', icon:'🔨' },
  { id:'grok',       name:'Grok',       role:'Аналитик',     color:'#FD79A8', icon:'🧠' },
  { id:'lucas',      name:'Lucas',      role:'Философ',      color:'#FDCB6E', icon:'💡' },
  { id:'harper',     name:'Harper',     role:'Исследователь',color:'#E17055', icon:'🔬' },
  { id:'benjamin',   name:'Benjamin',   role:'Хранитель',    color:'#55EFC4', icon:'📚' },
]

const SERVICES: ServiceStatus[] = [
  { id:'twitter',  name:'X / Twitter', icon:'𝕏',  connected:true,  color:'#1DA1F2' },
  { id:'telegram', name:'Telegram',    icon:'✈️', connected:true,  color:'#0088cc' },
  { id:'gmail',    name:'Gmail',       icon:'✉️', connected:false, color:'#EA4335' },
  { id:'github',   name:'GitHub',      icon:'⌥',  connected:true,  color:'#9ca3af' },
]

const QUICK = [
  'Что происходит с Bitcoin сейчас?',
  'Последние AI новости 2026',
  'Стратегия для запуска продукта',
  'Что такое GodLocal?',
]

const TOOL_LABEL: Record<string, string> = {
  web_search:         '🌐 поиск в интернете',
  fetch_url:          '📄 читаю страницу',
  get_market_data:    '📊 данные рынка',
  post_tweet:         '𝕏 публикую твит',
  send_telegram:      '✈️ отправляю в Telegram',
  create_github_issue:'⌥ создаю issue',
  remember:           '🧠 запоминаю',
  recall:             '🧠 вспоминаю',
}

// ─── MarkdownText (no deps) ────────────────────────────────────────────────────
function MarkdownText({ text, streaming }: { text:string; streaming?:boolean }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []

  lines.forEach((line, li) => {
    if (!line && li < lines.length - 1) { nodes.push(<br key={`b${li}`} />); return }
    const parts: React.ReactNode[] = []
    let rest = line, ki = 0

    while (rest.length) {
      const lk = rest.match(/^(.*?)\[([^\]]+)\]\((https?:\/\/[^)]+)\)(.*)$/)
      if (lk) {
        if (lk[1]) parts.push(<span key={ki++}>{lk[1]}</span>)
        parts.push(<a key={ki++} href={lk[3]} target="_blank" rel="noopener noreferrer"
          className="text-[#00FF9D] underline underline-offset-2 hover:text-white transition-colors break-all">
          {lk[2]} ↗</a>)
        rest = lk[4]; continue
      }
      const lb = rest.match(/^(.*?)\*\*(.*?)\*\*(.*)$/)
      if (lb) {
        if (lb[1]) parts.push(<span key={ki++}>{lb[1]}</span>)
        parts.push(<strong key={ki++} className="text-gray-100 font-semibold">{lb[2]}</strong>)
        rest = lb[3]; continue
      }
      const lc = rest.match(/^(.*?)`([^`]+)`(.*)$/)
      if (lc) {
        if (lc[1]) parts.push(<span key={ki++}>{lc[1]}</span>)
        parts.push(<code key={ki++} className="bg-[#0f1a1a] text-[#00FF9D] px-1.5 py-0.5 rounded text-xs font-mono">{lc[2]}</code>)
        rest = lc[3]; continue
      }
      const lu = rest.match(/^(.*?)(https?:\/\/[^\s<>]+)(.*)$/)
      if (lu) {
        if (lu[1]) parts.push(<span key={ki++}>{lu[1]}</span>)
        const label = lu[2].replace(/^https?:\/\//, '').slice(0, 36) + (lu[2].length > 40 ? '…' : '')
        parts.push(<a key={ki++} href={lu[2]} target="_blank" rel="noopener noreferrer"
          className="text-[#00FF9D] underline underline-offset-2 hover:text-white break-all">{label} ↗</a>)
        rest = lu[3]; continue
      }
      parts.push(<span key={ki++}>{rest}</span>); break
    }

    if (line.startsWith('### ')) nodes.push(<p key={li} className="font-semibold text-gray-100 mt-2 mb-0.5 text-sm">{parts}</p>)
    else if (line.startsWith('## ')) nodes.push(<p key={li} className="font-bold text-gray-100 mt-2 mb-1">{parts}</p>)
    else if (line.startsWith('- ') || line.startsWith('• '))
      nodes.push(<div key={li} className="flex gap-2 items-start my-0.5"><span className="text-gray-600 shrink-0 mt-0.5 text-xs">●</span><span className="flex-1">{parts}</span></div>)
    else { nodes.push(<span key={li}>{parts}</span>); if (li < lines.length - 1) nodes.push(<br key={`br${li}`} />) }
  })

  return <span>{nodes}{streaming && <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm opacity-70 align-middle" />}</span>
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OasisPage() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0])
  const [connected, setConnected]     = useState(false)
  const [connecting, setConnecting]   = useState(false)
  const [showAgents, setShowAgents]   = useState(false)
  const [showServices, setShowServices] = useState(false)
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [xpMap, setXpMap]             = useState<Record<string,number>>(Object.fromEntries(AGENTS.map(a=>[a.id,0])))
  const [sessionId]                   = useState(() => Math.random().toString(36).slice(2,10))

  const wsRef          = useRef<WebSocket|null>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const scrollRef      = useRef<HTMLDivElement|null>(null)
  const atBottomRef    = useRef<boolean>(true)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const fileRef        = useRef<HTMLInputElement>(null)
  const reconnTimer    = useRef<ReturnType<typeof setTimeout>|null>(null)

  // ── CRITICAL FIX: handleMsg in a ref to prevent stale closures ──
  const handleMsgRef = useRef<(d:any)=>void>(()=>{})

  const handleMsg = useCallback((data: any) => {
    const t = data.t || data.type
    if (t === 'token') {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming && last.role === 'agent' && last.agentId === 'godlocal')
          return [...prev.slice(0,-1), { ...last, content: last.content + (data.v||'') }]
        return [...prev, { id: rnd(), role:'agent', agentId:'godlocal', agentName:'GodLocal', content: data.v||'', streaming:true, ts:Date.now() }]
      })
      return
    }
    if (t === 'arch_reply' || t === 'agent_reply') {
      const aid  = (data.agent||'godlocal').toLowerCase()
      const agent = AGENTS.find(a=>a.id===aid) || AGENTS[0]
      setMessages(prev => [...prev, { id:rnd(), role:'agent', agentId:aid, agentName:agent.name, content:data.v||data.reply||'', streaming:false, ts:Date.now() }])
      setXpMap(p => ({ ...p, [aid]: (p[aid]||0)+1 }))
      return
    }
    if (t === 'done' || t === 'session_done') {
      setMessages(prev => prev.map(m => ({ ...m, streaming:false })))
      return
    }
    if (t === 'tool') {
      const label = TOOL_LABEL[data.n] || `🔧 ${data.n}`
      const q = data.q ? `: ${String(data.q).slice(0,60)}` : ''
      setMessages(prev => [...prev, { id:rnd(), role:'tool', content:`${label}${q}`, ts:Date.now() }])
      return
    }
    if (t === 'error') {
      setMessages(prev => [...prev, { id:rnd(), role:'tool', content:`❌ ${data.v||'error'}`, ts:Date.now() }])
    }
  }, [])

  // Always keep ref current
  useEffect(() => { handleMsgRef.current = handleMsg }, [handleMsg])

  // ── WebSocket ──
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    setConnecting(true)
    const ws = new WebSocket(`${WS_BASE}/ws/oasis?sid=${sessionId}`)
    wsRef.current = ws
    ws.onopen  = () => { setConnected(true); setConnecting(false) }
    ws.onclose = () => {
      setConnected(false); setConnecting(false)
      if (reconnTimer.current) clearTimeout(reconnTimer.current)
      reconnTimer.current = setTimeout(() => connectWS(), 4000)
    }
    ws.onerror = () => { setConnected(false); setConnecting(false) }
    // Use the ref — always calls latest handleMsg, never stale
    ws.onmessage = (e) => { try { handleMsgRef.current(JSON.parse(e.data)) } catch {} }
  }, [sessionId])

  useEffect(() => {
    connectWS()
    return () => { wsRef.current?.close(); if (reconnTimer.current) clearTimeout(reconnTimer.current) }
  }, [connectWS])

  // Smart scroll: only auto-scroll if user is already near the bottom
  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  // ── Send ──
  const send = useCallback(() => {
    const text = input.trim()
    if (!text) return
    const msg: Message = { id:rnd(), role:'user', content:text, ts:Date.now(), files: attachments.length ? [...attachments] : undefined }
    setMessages(prev => [...prev, msg])
    setInput('')
    setAttachments([])
    if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.blur() }

    const payload: any = { prompt: text, session_id: sessionId, agent: activeAgent.id }
    if (attachments.length) payload.files = attachments.map(f=>f.url)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    } else {
      connectWS()
      // Retry after reconnect
      const t = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload))
      }, 2000)
      return () => clearTimeout(t)
    }
    setXpMap(p => ({ ...p, [activeAgent.id]: (p[activeAgent.id]||0)+1 }))
  }, [input, attachments, activeAgent, sessionId, connectWS])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── File attach ──
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files||[])
    files.forEach(f => {
      const url = URL.createObjectURL(f)
      setAttachments(prev => [...prev, { name:f.name, url, type:f.type, size:f.size }])
    })
    e.target.value = ''
  }

  const rnd = () => Math.random().toString(36).slice(2,10)

  // ── Resize textarea ──
  const resizeTA = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col bg-[#030508] text-gray-200 overflow-hidden"
      style={{ height:'100dvh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 border-b border-[#0d131e] bg-[#030508]"
        style={{ paddingTop:'max(env(safe-area-inset-top),12px)', paddingBottom:'10px' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <a href="/" className="text-gray-600 hover:text-gray-300 p-1 -ml-1 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <span className="text-[#00FF9D] font-bold tracking-[0.2em] text-sm shrink-0">OASIS</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Connection pill */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${
            connected ? 'border-[#00FF9D]/20 text-[#00FF9D] bg-[#00FF9D]/08' : 'border-gray-800 text-gray-600 bg-transparent'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#00FF9D] animate-pulse' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-600'}`}/>
            <span>{connected ? 'live' : connecting ? '…' : 'off'}</span>
          </div>
          {/* Services button */}
          <button onClick={() => { setShowServices(!showServices); setShowAgents(false) }}
            className={`p-2 rounded-xl border transition-all ${showServices ? 'border-[#6C5CE7]/50 bg-[#6C5CE7]/15 text-[#6C5CE7]' : 'border-[#0d131e] text-gray-600 hover:text-gray-400'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </button>
          {/* Agent button + XP */}
          <button onClick={() => { setShowAgents(!showAgents); setShowServices(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all"
            style={{ borderColor: activeAgent.color+'40', background: activeAgent.color+'10', color: activeAgent.color }}>
            <span className="text-sm">{activeAgent.icon}</span>
            <span className="font-medium">{activeAgent.name}</span>
            {(xpMap[activeAgent.id]||0) > 0 && (
              <span className="opacity-60 font-mono text-xs">{xpMap[activeAgent.id]}xp</span>
            )}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Agent picker ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAgents && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="shrink-0 overflow-hidden border-b border-[#0d131e] bg-[#040609]">
            <div className="flex gap-2 overflow-x-auto px-3 py-2.5" style={{scrollbarWidth:'none'}}>
              {AGENTS.map(a => {
                const xp = xpMap[a.id] || 0
                const on = activeAgent.id === a.id
                return (
                  <button key={a.id} onClick={() => { setActiveAgent(a); setShowAgents(false) }}
                    className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all min-w-[64px]"
                    style={{ borderColor: on ? a.color+'60' : '#111827', background: on ? a.color+'15' : 'transparent' }}>
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-xs font-semibold mt-0.5" style={{color: on ? a.color : '#9ca3af'}}>{a.name}</span>
                    <span className="text-gray-700" style={{fontSize:9}}>{xp} xp</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Services panel ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showServices && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="shrink-0 overflow-hidden border-b border-[#0d131e] bg-[#040609]">
            <div className="px-4 py-3">
              <div className="text-xs text-gray-600 uppercase tracking-widest mb-2.5">Сервисы</div>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(svc => (
                  <div key={svc.id} className="flex items-center gap-2.5 px-3 py-2 bg-[#080d14] rounded-xl border border-[#0f1820]">
                    <span className="text-base">{svc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-300 truncate">{svc.name}</div>
                      <div className={`text-xs ${svc.connected ? 'text-[#00FF9D]' : 'text-gray-600'}`}>
                        {svc.connected ? '● подключён' : '○ не подключён'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-700 text-xs mt-2">Агенты используют эти сервисы при ответе</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain"
        style={{WebkitOverflowScrolling:'touch'}}
        onScroll={e => {
          const el = e.currentTarget
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}>
        <div className="px-4 py-3">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 py-8">
              <div className="text-5xl">⚡</div>
              <div className="text-center">
                <div className="text-[#00FF9D] font-bold text-lg tracking-widest mb-1">OASIS</div>
                <div className="text-gray-600 text-sm">7 агентов · живой поиск · память</div>
              </div>
              <div className="w-full max-w-xs space-y-2">
                {QUICK.map((q, i) => (
                  <button key={i} onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="w-full text-left text-sm px-4 py-2.5 bg-[#07090f] border border-[#0f1820] rounded-2xl text-gray-500 hover:text-gray-300 hover:border-[#1a2535] active:bg-[#0f1a24] transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map(msg => {
              const agent = AGENTS.find(a => a.id === msg.agentId)

              /* User */
              if (msg.role === 'user') return (
                <motion.div key={msg.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="flex justify-end mb-3">
                  <div className="max-w-[82%]">
                    {msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                        {msg.files.map((f, fi) => (
                          f.type.startsWith('image/') ? (
                            <img key={fi} src={f.url} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-[#1a2535]" />
                          ) : (
                            <div key={fi} className="flex items-center gap-1.5 bg-[#080d14] border border-[#1a2535] rounded-lg px-2.5 py-1.5">
                              <span className="text-xs">📄</span>
                              <span className="text-xs text-gray-400 truncate max-w-[80px]">{f.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <div className="bg-[#6C5CE7]/18 border border-[#6C5CE7]/30 rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              )

              /* Tool pill */
              if (msg.role === 'tool') return (
                <motion.div key={msg.id} initial={{opacity:0}} animate={{opacity:1}} className="flex justify-center my-1.5">
                  <span className="text-xs text-yellow-700/80 bg-[#0a0e14] px-3 py-1 rounded-full border border-yellow-900/20 max-w-[90%] truncate font-mono">
                    {msg.content}
                  </span>
                </motion.div>
              )

              /* Agent */
              return (
                <motion.div key={msg.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="flex gap-2.5 mb-4 items-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm border mt-0.5"
                    style={{background:(agent?.color||'#00FF9D')+'12', borderColor:(agent?.color||'#00FF9D')+'35'}}>
                    {agent?.icon||'⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold mb-1" style={{color: agent?.color||'#00FF9D'}}>
                      {msg.agentName||'GodLocal'}
                    </div>
                    <div className="bg-[#080d14] border border-[#0f1820] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 leading-relaxed">
                      <MarkdownText text={msg.content} streaming={msg.streaming} />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>



      {/* ── Attachment preview strip ─────────────────────────────────────────── */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="shrink-0 flex gap-2 overflow-x-auto px-4 py-2 bg-[#030508] border-t border-[#0d131e]"
            style={{scrollbarWidth:'none'}}>
            {attachments.map((f, fi) => (
              <div key={fi} className="relative shrink-0 group">
                {f.type.startsWith('image/') ? (
                  <img src={f.url} alt={f.name} className="w-14 h-14 object-cover rounded-xl border border-[#1a2535]" />
                ) : (
                  <div className="w-14 h-14 flex flex-col items-center justify-center bg-[#080d14] border border-[#1a2535] rounded-xl">
                    <span className="text-xl">📄</span>
                    <span className="text-gray-600 truncate w-full text-center px-1" style={{fontSize:8}}>{f.name.slice(0,8)}</span>
                  </div>
                )}
                <button onClick={() => setAttachments(prev => prev.filter((_,i)=>i!==fi))}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shadow">
                  ×
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#030508] px-3 py-2.5"
        style={{paddingBottom:'max(env(safe-area-inset-bottom),10px)'}}>
        <div className="flex items-end gap-2 bg-[#07090f] border border-[#111827] rounded-2xl px-2 py-2
                        focus-within:border-[#1a2535] transition-colors">

          {/* Attach files */}
          <button onClick={() => fileRef.current?.click()}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-gray-600 hover:text-gray-400 hover:bg-[#0f1520] transition-all active:scale-95">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.json,.csv"
            className="hidden" onChange={onFileChange} />

          {/* Textarea */}
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            onInput={e => resizeTA(e.currentTarget)}
            placeholder={`Спроси ${activeAgent.name}…`}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-200 placeholder-gray-700 leading-relaxed py-1"
            rows={1}
            style={{maxHeight:120, overflowY:'auto', minWidth:0}} />

          {/* Send */}
          <button onClick={send} disabled={!input.trim() && attachments.length === 0}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed"
            style={{background: (input.trim() || attachments.length) ? activeAgent.color : '#1a2535'}}>
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
