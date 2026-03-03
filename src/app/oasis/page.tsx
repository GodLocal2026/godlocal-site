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
interface AttachedFile { name:string; url:string; type:string; size:number; base64?:string }
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
  { id:'twitter',  name:'X / Twitter', icon:'𝕏',  connected:false, color:'#1DA1F2' },
  { id:'telegram', name:'Telegram',    icon:'✈️', connected:false, color:'#0088cc' },
  { id:'gmail',    name:'Gmail',       icon:'✉️', connected:false, color:'#EA4335' },
  { id:'github',   name:'GitHub',      icon:'🐙', connected:false, color:'#6e40c9' },
]

const SVC_FIELDS: Record<string, { label: string; placeholder: string; hint: string }> = {
  twitter:  { label:'Bearer Token',          placeholder:'AAAA...', hint:'twitter.com/settings → Developer → Bearer token' },
  telegram: { label:'Bot Token',             placeholder:'1234567890:ABC...', hint:'Создай бота через @BotFather' },
  gmail:    { label:'App Password',          placeholder:'xxxx xxxx xxxx xxxx', hint:'Google Account → Security → App passwords' },
  github:   { label:'Personal Access Token', placeholder:'ghp_...', hint:'github.com/settings/tokens → Generate new token' },
}


// Sub-component for account connection card (needs hooks)
const TASK_TEMPLATES = [
  // Social
  { id:'tweet',  icon:'𝕏',  label:'Опубликовать твит', desc:'Публикует пост в X/Twitter', svc:'twitter',
    color:'#1DA1F2', prompt:'Опубликуй твит: ' },
  { id:'tg',    icon:'✈️', label:'Отправить в Telegram', desc:'Сообщение в X100Agent', svc:'telegram',
    color:'#0088cc', prompt:'Отправь в Telegram: ' },
  // Dev
  { id:'issue', icon:'🐙', label:'Создать GitHub Issue', desc:'Новый issue в репозитории', svc:'github',
    color:'#6e40c9', prompt:'Создай GitHub issue с заголовком "" и описанием: ' },
  { id:'code',  icon:'💻', label:'Написать код', desc:'Генерация, рефакторинг, отладка', svc:null,
    color:'#00FF9D', prompt:'Напиши код: ' },
  // Research
  { id:'search', icon:'🌐', label:'Поиск в интернете', desc:'Актуальная информация из сети', svc:null,
    color:'#FDCB6E', prompt:'Найди в интернете: ' },
  { id:'market', icon:'📊', label:'Данные рынка', desc:'Криптo, акции, токены', svc:null,
    color:'#E17055', prompt:'Покажи данные рынка по: ' },
  // Memory
  { id:'remember', icon:'🧠', label:'Запомнить',  desc:'Сохранить в долгосрочную память', svc:null,
    color:'#A29BFE', prompt:'Запомни это: ' },
  { id:'recall',   icon:'🔍', label:'Вспомнить',  desc:'Что я тебе говорил о', svc:null,
    color:'#A29BFE', prompt:'Что ты знаешь о ' },
]


function SvcCard({ svc, onDone }: { svc: ServiceStatus & { color: string }; onDone: () => void }) {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(`gl_${svc.id}`) : null
  const [isConnected, setIsConnected] = useState(!!stored)
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const color = svc.color

  const disconnect = () => { localStorage.removeItem(`gl_${svc.id}`); setIsConnected(false); setEditing(false) }
  const connect = () => {
    if (!val.trim()) return
    localStorage.setItem(`gl_${svc.id}`, val.trim())
    setIsConnected(true); setVal(''); setEditing(false)
  }

  return (
    <div className="rounded-2xl border bg-[#080d14] overflow-hidden" style={{borderColor: isConnected ? color+'30' : '#0f1820'}}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{background: color+'18', border:`1px solid ${color}30`}}>
          {svc.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-200">{svc.name}</div>
          <div className="text-xs mt-0.5" style={{color: isConnected ? color : '#4b5563'}}>
            {isConnected ? '● подключён' : '○ не подключён'}
          </div>
        </div>
        <button onClick={() => { if (isConnected) disconnect(); else setEditing(e => !e) }}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          style={isConnected
            ? {background:'#1a0a0a', color:'#ef4444', border:'1px solid #ef444430'}
            : {background: color+'18', color, border:`1px solid ${color}40`}}>
          {isConnected ? 'Отключить' : editing ? 'Отмена' : 'Подключить'}
        </button>
      </div>
      {editing && !isConnected && (
        <div className="px-4 pb-3 space-y-2">
          <div className="text-xs text-gray-600">{SVC_FIELDS[svc.id]?.hint}</div>
          <div className="flex gap-2">
            <input value={val} onChange={e => setVal(e.target.value)}
              placeholder={SVC_FIELDS[svc.id]?.placeholder}
              className="flex-1 bg-[#0d1520] border border-[#1a2535] rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-700 outline-none focus:border-[#2a3a55]"
            />
            <button onClick={connect}
              className="px-4 py-2 rounded-xl text-xs font-bold active:scale-95"
              style={{background: color, color:'#000'}}>
              ОК
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const segments: Array<{kind:'code';lang:string;body:string}|{kind:'normal';body:string}> = []
  const codeRe = /```([\w]*)?\n?([\s\S]*?)```/g
  let last = 0; let m: RegExpExecArray|null
  while ((m = codeRe.exec(text))) {
    if (m.index > last) segments.push({kind:'normal', body:text.slice(last, m.index)})
    segments.push({kind:'code', lang:m[1]||'', body:m[2]})
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({kind:'normal', body:text.slice(last)})

  function renderInline(raw: string) {
    const parts: React.ReactNode[] = []; let rest = raw; let ki = 0
    while (rest.length) {
      const lk = rest.match(/^(.*?)\[([^\]]+)\]\((https?:\/\/[^)]+)\)(.*)$/)
      if (lk) { if(lk[1]) parts.push(<span key={ki++}>{lk[1]}</span>); parts.push(<a key={ki++} href={lk[3]} target="_blank" rel="noopener noreferrer" className="text-[#00FF9D] underline underline-offset-2 hover:text-white transition-colors break-all">{lk[2]} ↗</a>); rest=lk[4]; continue }
      const lb = rest.match(/^(.*?)\*\*(.*?)\*\*(.*)$/)
      if (lb) { if(lb[1]) parts.push(<span key={ki++}>{lb[1]}</span>); parts.push(<strong key={ki++} className="text-gray-100 font-semibold">{lb[2]}</strong>); rest=lb[3]; continue }
      const lc = rest.match(/^(.*?)`([^`]+)`(.*)$/)
      if (lc) { if(lc[1]) parts.push(<span key={ki++}>{lc[1]}</span>); parts.push(<code key={ki++} className="bg-[#0f1a1a] text-[#00FF9D] px-1.5 py-0.5 rounded text-xs font-mono">{lc[2]}</code>); rest=lc[3]; continue }
      const lu = rest.match(/^(.*?)(https?:\/\/[^\s<>]+)(.*)$/)
      if (lu) { if(lu[1]) parts.push(<span key={ki++}>{lu[1]}</span>); const label=lu[2].replace(/^https?:\/\//,'').slice(0,36)+(lu[2].length>40?'…':''); parts.push(<a key={ki++} href={lu[2]} target="_blank" rel="noopener noreferrer" className="text-[#00FF9D] underline underline-offset-2 hover:text-white break-all">{label} ↗</a>); rest=lu[3]; continue }
      parts.push(<span key={ki++}>{rest}</span>); break
    }
    return parts
  }

  function renderNormal(body: string, si: number) {
    const rawLines = body.split('\n')
    const nodes: React.ReactNode[] = []
    let i = 0
    while (i < rawLines.length) {
      const line = rawLines[i]
      if (line.trim().startsWith('|')) {
        const tbl: string[] = []
        while (i < rawLines.length && rawLines[i].trim().startsWith('|')) { tbl.push(rawLines[i]); i++ }
        const rows = tbl.filter(r => !/^\s*\|[-\s:|]+\|\s*$/.test(r))
        const header = rows[0]?.split('|').slice(1,-1).map(c=>c.trim()) ?? []
        const brows = rows.slice(1)
        nodes.push(
          <div key={`tbl${si}_${i}`} className="overflow-x-auto my-2 rounded-lg border border-[#1a2535]">
            <table className="text-xs w-full border-collapse">
              <thead><tr>{header.map((h,hi)=><th key={hi} className="border-b border-[#1a2535] px-3 py-1.5 text-left text-[#00FF9D] font-semibold bg-[#0a1220]">{h}</th>)}</tr></thead>
              <tbody>{brows.map((r,ri)=>{ const cells=r.split('|').slice(1,-1).map(c=>c.trim()); return <tr key={ri} className={ri%2===0?'bg-[#060b10]':'bg-[#06090f]'}>{cells.map((c,ci)=><td key={ci} className="border-t border-[#0f1820] px-3 py-1.5 text-gray-400">{c}</td>)}</tr> })}</tbody>
            </table>
          </div>
        )
        continue
      }
      if (!line && i < rawLines.length-1) { nodes.push(<br key={`br${si}_${i}`}/>); i++; continue }
      const stripped = line.replace(/^#{1,3} /,'')
      const inl = renderInline(stripped)
      if (line.startsWith('### ')) { nodes.push(<p key={`s${si}l${i}`} className="font-semibold text-gray-100 mt-2 mb-0.5 text-sm">{inl}</p>); i++; continue }
      if (line.startsWith('## ')) { nodes.push(<p key={`s${si}l${i}`} className="font-bold text-gray-100 mt-2 mb-1">{inl}</p>); i++; continue }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const p2 = renderInline(line.replace(/^[•\-] /,''))
        nodes.push(<div key={`s${si}l${i}`} className="flex gap-2 items-start my-0.5"><span className="text-gray-600 shrink-0 mt-0.5 text-xs">●</span><span className="flex-1">{p2}</span></div>); i++; continue
      }
      const nm = line.match(/^(\d+)\. (.*)$/)
      if (nm) {
        const p3 = renderInline(nm[2])
        nodes.push(<div key={`s${si}l${i}`} className="flex gap-2 items-start my-0.5"><span className="text-gray-500 shrink-0 text-xs font-mono w-4 text-right mt-0.5">{nm[1]}.</span><span className="flex-1">{p3}</span></div>); i++; continue
      }
      const rp = renderInline(line)
      nodes.push(<span key={`s${si}l${i}`}>{rp}</span>)
      if (i < rawLines.length-1) nodes.push(<br key={`s${si}br${i}`}/>)
      i++
    }
    return nodes
  }

  return (
    <span>
      {segments.map((seg,si) => seg.kind==='code'
        ? <div key={si} className="my-2 rounded-lg overflow-hidden border border-[#1a2535]">
            {seg.lang && <div className="px-3 py-1 bg-[#0a1220] text-gray-500 text-xs font-mono border-b border-[#1a2535]">{seg.lang}</div>}
            <pre className="overflow-x-auto p-3 bg-[#060b10] text-[#00FF9D] text-xs font-mono leading-relaxed whitespace-pre">{seg.body.trimEnd()}</pre>
          </div>
        : <span key={si}>{renderNormal(seg.body, si)}</span>
      )}
      {streaming && <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm opacity-70 align-middle"/>}
    </span>
  )
}
// ─── Main Component ────────────────────────────────────────────────────────────
export default function OasisPage() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [activeAgent, setActiveAgent] = useState<Agent>(AGENTS[0])
  const [connected, setConnected]     = useState(false)
  const [connecting, setConnecting]   = useState(false)
  const [isWaiting, setIsWaiting]     = useState(false)   // waiting for first token
  const [activeArchetypes, setActiveArchetypes] = useState<string[]>([]) // archetypes currently computing
  const [lang, setLang] = useState<'ru'|'uk'|'en'>(() => {
    if (typeof window === 'undefined') return 'ru'
    return (localStorage.getItem('gl_lang') as 'ru'|'uk'|'en') || 'ru'
  })
  const cycleLang = () => setLang(l => {
    const next = l==='ru' ? 'uk' : l==='uk' ? 'en' : 'ru'
    localStorage.setItem('gl_lang', next); return next
  })
  const [showAgents, setShowAgents]   = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [feedback, setFeedback] = useState<Record<string,'exact'|'partial'|'miss'>>(() => {
    try { return JSON.parse(localStorage.getItem('gl_feedback')||'{}') } catch { return {} }
  })

  const handleFeedback = useCallback((id: string, vote: 'exact'|'partial'|'miss') => {
    setFeedback(prev => {
      const next = {...prev}
      if (prev[id] === vote) delete next[id]; else next[id] = vote
      try { localStorage.setItem('gl_feedback', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const [artifacts, setArtifacts] = useState<{id:string;content:string;agentName?:string;ts:number}[]>(() => {
    try { return JSON.parse(localStorage.getItem('gl_artifacts')||'[]') } catch { return [] }
  })

  const saveArtifact = useCallback((msg: Message) => {
    setArtifacts(prev => {
      const next = prev.some(a => a.id === msg.id)
        ? prev.filter(a => a.id !== msg.id)
        : [{ id:msg.id, content:msg.content, agentName:msg.agentName, ts:msg.ts }, ...prev].slice(0, 50)
      try { localStorage.setItem('gl_artifacts', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const [showMemory, setShowMemory] = useState(false)
  const [memory, setMemory] = useState<string[]>([])
  const [showArtifacts, setShowArtifacts] = useState(false)
  const [showSkills, setShowSkills] = useState(false)

  const fetchMemory = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/memory?session_id=${sessionId}`)
      if (r.ok) { const d = await r.json(); setMemory(Array.isArray(d) ? d : (d.memories || [])) }
    } catch {}
  }, [])

  const [expandedTools, setExpandedTools] = useState<Record<string,boolean>>({})
  const toggleTools = (id: string) => setExpandedTools(p => ({...p, [id]: !p[id]}))

  function extractQuestions(text: string): string[] {
    const qs = (text.match(/[^.!?\n]*\?/g) || [])
      .map(s => s.replace(/[\n\r]+/g,' ').trim())
      .filter(s => s.length > 10 && s.length < 90)
    return Array.from(new Set(qs)).slice(0,3)
  }
  const [vvHeight,     setVvHeight]     = useState<number|null>(null)
  const [listening,    setListening]    = useState(false)
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [xpMap, setXpMap]             = useState<Record<string,number>>(Object.fromEntries(AGENTS.map(a=>[a.id,0])))
  const [sessionId]                   = useState(() => Math.random().toString(36).slice(2,10))

  const wsRef          = useRef<WebSocket|null>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const scrollRef      = useRef<HTMLDivElement|null>(null)
  const atBottomRef    = useRef<boolean>(true)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const fileRef        = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const reconnTimer    = useRef<ReturnType<typeof setTimeout>|null>(null)

  // ── CRITICAL FIX: handleMsg in a ref to prevent stale closures ──
  const handleMsgRef = useRef<(d:any)=>void>(()=>{})

  const handleMsg = useCallback((data: any) => {
    const t = data.t || data.type
    if (t === 'token') {
      setIsWaiting(false)  // first token arrived — stop spinner
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.streaming && last.role === 'agent' && last.agentId === 'godlocal')
          return [...prev.slice(0,-1), { ...last, content: last.content + (data.v||'') }]
        return [...prev, { id: rnd(), role:'agent', agentId:'godlocal', agentName:'GodLocal', content: data.v||'', streaming:true, ts:Date.now() }]
      })
      return
    }
    if (t === 'arch_start') {
      // backend signals which archetype is about to compute
      setActiveArchetypes(prev => Array.from(new Set([...prev, data.agent || ''])).filter(Boolean))
      return
    }
    if (t === 'arch_reply' || t === 'agent_reply') {
      const aid  = (data.agent||'godlocal').toLowerCase()
      const agent = AGENTS.find(a=>a.id===aid) || AGENTS[0]
      setActiveArchetypes(prev => prev.filter(a => a !== aid))  // done
      setMessages(prev => [...prev, { id:rnd(), role:'agent', agentId:aid, agentName:agent.name, content:data.v||data.reply||'', streaming:false, ts:Date.now() }])
      setXpMap(p => ({ ...p, [aid]: (p[aid]||0)+1 }))
      return
    }
    if (t === 'synthesis') {
      // Council synthesis — show as special message
      setMessages(prev => [...prev, { id:rnd(), role:'agent', agentId:'godlocal', agentName:'⚡ Синтез', content: data.v || '', streaming:false, ts:Date.now() }])
      return
    }
    if (t === 'done' || t === 'session_done') {
      setIsWaiting(false)
      setActiveArchetypes([])
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
      setIsWaiting(false)
      setActiveArchetypes([])
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

  // Static input: track visual viewport (keyboard-aware on iOS/Android)
  useEffect(() => {
    const vv = (window as any).visualViewport
    if (!vv) return
    const fn = () => setVvHeight(vv.height)
    vv.addEventListener('resize', fn)
    vv.addEventListener('scroll', fn)
    fn()
    return () => { vv.removeEventListener('resize', fn); vv.removeEventListener('scroll', fn) }
  }, [])

  // ── Send ──
  const send = useCallback(() => {
    const text = input.trim()
    if (!text && attachments.length === 0) return
    const msg: Message = { id:rnd(), role:'user', content:text, ts:Date.now(), files: attachments.length ? [...attachments] : undefined }
    setMessages(prev => [...prev, msg])
    setInput('')
    setAttachments([])
    if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.blur() }

    // Collect stored service tokens for backend tool use
    const svcTokens: Record<string,string> = {}
    if (typeof window !== 'undefined') {
      const keys = ['twitter','telegram','gmail','github']
      keys.forEach(k => { const v = localStorage.getItem(`gl_${k}`); if (v) svcTokens[k] = v })
    }
    const payload: any = { prompt: text, session_id: sessionId, agent: activeAgent.id, lang, ...(Object.keys(svcTokens).length ? { service_tokens: svcTokens } : {}) }
    if (attachments.length) {
      const imgs = attachments.filter(f => f.type.startsWith('image/') && f.base64)
      if (imgs.length) payload.image_base64 = imgs[0].base64   // first image → vision
      const docs = attachments.filter(f => !f.type.startsWith('image/'))
      if (docs.length) payload.files = docs.map(f => f.name)
    }

    setIsWaiting(true)
    setActiveArchetypes([])
    // Safety: reset waiting state after 30s to prevent infinite spinner
    const safetyTimer = setTimeout(() => { setIsWaiting(false); setActiveArchetypes([]) }, 30000)
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
  }, [input, attachments, activeAgent, sessionId, connectWS, lang])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Voice input ──
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    rec.lang = 'ru-RU'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      setInput((prev: string) => prev ? prev + ' ' + text : text)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  // ── File attach ──
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files||[])
    files.forEach(f => {
      const url = URL.createObjectURL(f)
      if (f.type.startsWith('image/')) {
        // Resize + base64 encode for backend
        const reader = new FileReader()
        reader.onload = () => {
          const full = reader.result as string
          // Compress: draw onto canvas at max 512px
          const img = new Image()
          img.onload = () => {
            const MAX = 512
            const scale = Math.min(1, MAX / Math.max(img.width, img.height))
            const canvas = document.createElement('canvas')
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
            const b64 = canvas.toDataURL('image/jpeg', 0.75)
            setAttachments(prev => [...prev, { name:f.name, url, type:f.type, size:f.size, base64:b64 }])
          }
          img.src = full
        }
        reader.readAsDataURL(f)
      } else {
        setAttachments(prev => [...prev, { name:f.name, url, type:f.type, size:f.size }])
      }
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
    <div className="relative flex flex-col text-gray-200 overflow-hidden"
      style={{ height: vvHeight ? `${vvHeight}px` : '100dvh', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes siriSpin { from{transform:rotate(0deg) scale(1)} 33%{transform:rotate(120deg) scale(1.06)} 66%{transform:rotate(240deg) scale(0.96)} to{transform:rotate(360deg) scale(1)} }
        @keyframes siriPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
        @keyframes siriGlow { 0%,100%{box-shadow:0 0 14px 3px rgba(0,122,255,0.55),0 0 28px 6px rgba(88,86,214,0.28)} 50%{box-shadow:0 0 22px 6px rgba(255,45,85,0.5),0 0 44px 12px rgba(0,122,255,0.22)} }
      `}} />

      {/* ── Background layers ─────────────────────────────────────────────── */}
      <div style={{position:'absolute',inset:0,backgroundImage:'url(/oasis-bg.jpg)',backgroundSize:'cover',backgroundPosition:'center top',filter:'saturate(1.5) brightness(1.15)',zIndex:-2,pointerEvents:'none'}} />
      <div style={{position:'absolute',inset:0,background:'rgba(3,5,8,0.55)',zIndex:-1,pointerEvents:'none'}} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 border-b border-[#0d131e]"
        style={{ paddingTop:'max(env(safe-area-inset-top),12px)', paddingBottom:'10px', background:'rgba(3,5,8,0.80)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <a href="/" className="text-gray-600 hover:text-gray-300 p-1 -ml-1 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <svg width="62" height="20" viewBox="0 0 62 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <defs>
              <linearGradient id="og1" x1="0" y1="0" x2="62" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00FF9D"/>
                <stop offset="60%" stopColor="#00C8FF"/>
                <stop offset="100%" stopColor="#6C5CE7"/>
              </linearGradient>
            </defs>
            <text x="0" y="16" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif" fontSize="16" fontWeight="800" letterSpacing="3" fill="url(#og1)">OASIS</text>
          </svg>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-[#00FF9D] animate-pulse' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-600'}`}/>
          {/* Lang switcher — globe dropdown */}
          <div className="relative shrink-0">
            <button onClick={() => setShowLangMenu(v => !v)}
              className="text-sm px-2 py-1 rounded-full border border-[#1a2535] text-gray-400 hover:border-[#00FF9D]/40 hover:text-[#00FF9D] transition-all active:scale-95"
              title="Переключить язык">
              🌎
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#080d14] border border-[#1a2535] rounded-xl overflow-hidden shadow-xl" style={{minWidth:90}}>
                {(['ru','uk','en'] as const).map(l => (
                  <button key={l} onClick={() => { setLang(l); localStorage.setItem('gl_lang', l); setShowLangMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-[#0d1520] transition-colors"
                    style={{color: lang === l ? '#00FF9D' : '#9ca3af'}}>
                    <span>{l === 'ru' ? '🇷🇺' : l === 'uk' ? '🇺🇦' : '🇬🇧'}</span>
                    <span className="font-mono">{l === 'ru' ? 'RU' : l === 'uk' ? 'UA' : 'EN'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Agent selector — icon + name only, no XP clutter */}
          <button onClick={() => { setShowAgents(a => !a); setShowAccounts(false) }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all shrink-0 active:scale-95"
            style={{ borderColor: activeAgent.color+'50', background: showAgents ? activeAgent.color+'22' : activeAgent.color+'12', color: activeAgent.color }}>
            <span style={{fontSize:16, lineHeight:1}}>{activeAgent.icon}</span>
            <span className="text-xs font-semibold tracking-wide" style={{maxWidth:64, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}>{activeAgent.name}</span>
            <svg className="w-3 h-3 shrink-0 opacity-60 transition-transform" style={{transform: showAgents ? 'rotate(180deg)' : 'rotate(0deg)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* ── Accounts Connection Sheet ──────────────────────────────────────── */}
      <AnimatePresence>
        {showAccounts && (
          <motion.div
            initial={{opacity:0, y:40}} animate={{opacity:1, y:0}} exit={{opacity:0, y:40}}
            transition={{type:'spring', stiffness:320, damping:30}}
            className="absolute inset-x-0 bottom-0 z-50 bg-[#060a12] border-t border-[#0f1820] rounded-t-2xl shadow-2xl"
            style={{maxHeight:'80%', overflowY:'auto'}}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#1a2535]"/>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#0f1820]">
              <div>
                <div className="text-sm font-bold text-gray-100">Подключение аккаунтов</div>
                <div className="text-xs text-gray-600 mt-0.5">Агенты используют эти сервисы при ответе</div>
              </div>
              <button onClick={() => setShowAccounts(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0f1820] text-gray-500 active:bg-[#1a2535]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {/* Service cards */}
            <div className="px-4 py-3 space-y-2.5">
              {SERVICES.map(svc => <SvcCard key={svc.id} svc={svc} onDone={() => {}} />)}
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
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="oc1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00FF9D" stopOpacity="0.18"/>
                    <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0"/>
                  </radialGradient>
                  <linearGradient id="oc2" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00FF9D"/>
                    <stop offset="50%" stopColor="#00C8FF"/>
                    <stop offset="100%" stopColor="#6C5CE7"/>
                  </linearGradient>
                </defs>
                {/* Glow bg */}
                <circle cx="40" cy="40" r="38" fill="url(#oc1)"/>
                {/* Outer ring */}
                <circle cx="40" cy="40" r="35" stroke="url(#oc2)" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="4 3"/>
                {/* Inner ring */}
                <circle cx="40" cy="40" r="26" stroke="url(#oc2)" strokeWidth="1" strokeOpacity="0.35"/>
                {/* Horizon line - oasis water */}
                <path d="M18 48 Q30 42 40 48 Q50 54 62 48" stroke="url(#oc2)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                {/* Sun rising */}
                <circle cx="40" cy="36" r="8" fill="url(#oc2)" opacity="0.9"/>
                {/* Sun rays */}
                <line x1="40" y1="24" x2="40" y2="20" stroke="url(#oc2)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="52" y1="28" x2="55" y2="25" stroke="url(#oc2)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="28" y1="28" x2="25" y2="25" stroke="url(#oc2)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="56" y1="36" x2="60" y2="36" stroke="url(#oc2)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="24" y1="36" x2="20" y2="36" stroke="url(#oc2)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div className="text-center">
                <svg width="90" height="24" viewBox="0 0 90 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2">
                  <defs>
                    <linearGradient id="ot1" x1="0" y1="0" x2="90" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#00FF9D"/>
                      <stop offset="50%" stopColor="#00C8FF"/>
                      <stop offset="100%" stopColor="#6C5CE7"/>
                    </linearGradient>
                  </defs>
                  <text x="4" y="20" fontFamily="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif" fontSize="20" fontWeight="800" letterSpacing="4" fill="url(#ot1)">OASIS</text>
                </svg>
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
            {messages.map((msg, msgIdx) => {
              const agent = AGENTS.find(a => a.id === msg.agentId)
              // Collect tool messages immediately preceding this agent message
              const msgTools = msg.role === 'agent' ? (() => {
                const tools: Message[] = []
                for (let i = msgIdx - 1; i >= 0 && messages[i].role === 'tool'; i--) tools.unshift(messages[i])
                return tools
              })() : []

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

              /* Tool — shown in accordion above agent reply */
              if (msg.role === 'tool') return null

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
                    {/* ── Live Tool Feed accordion ───────────────────── */}
                    {msgTools.length > 0 && (
                      <div className="mb-1.5">
                        <button onClick={() => toggleTools(msg.id)}
                          className="flex items-center gap-1.5 text-xs text-yellow-600/70 hover:text-yellow-500/90 transition-colors">
                          <span className={`transition-transform ${expandedTools[msg.id] ? 'rotate-90' : ''}`}>▶</span>
                          <span>{expandedTools[msg.id] ? 'скрыть инструменты' : `${msgTools.length} инстр.`}</span>
                        </button>
                        {expandedTools[msg.id] && (
                          <div className="mt-1 space-y-0.5">
                            {msgTools.map(t => (
                              <div key={t.id} className="text-xs font-mono text-yellow-700/60 bg-[#0a0e14] px-2.5 py-1 rounded-lg border border-yellow-900/20 truncate">
                                {TOOL_LABEL[t.content.split(':')[0]] || t.content.split(':')[0]} {t.content.includes(':') ? '→ ' + t.content.split(':').slice(1).join(':').trim().slice(0,60) : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-[#080d14] border border-[#0f1820] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 leading-relaxed">
                      <MarkdownText text={msg.content} streaming={msg.streaming} />
                    </div>
                    {!msg.streaming && (
                      <div className="flex items-center gap-3 mt-1 px-1">
                        <button title="Copy" onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="text-gray-700 hover:text-gray-400 transition-colors text-xs active:scale-95">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        </button>
                        <button title="Сохранить" onClick={() => saveArtifact(msg)}
                          className={`text-xs transition-all active:scale-95 ${artifacts.some(a => a.id === msg.id) ? 'text-[#FDCB6E]' : 'text-gray-700 hover:text-gray-400'}`}>
                          {artifacts.some(a => a.id === msg.id) ? '★' : '☆'}
                        </button>
                        <button onClick={() => handleFeedback(msg.id,'exact')} title="Точно"
                          className={`text-sm transition-all active:scale-95 ${feedback[msg.id]==='exact' ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-70'}`}>🎯</button>
                        <button onClick={() => handleFeedback(msg.id,'partial')} title="Частично"
                          className={`text-sm transition-all active:scale-95 ${feedback[msg.id]==='partial' ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-70'}`}>🤔</button>
                        <button onClick={() => handleFeedback(msg.id,'miss')} title="Мимо"
                          className={`text-sm transition-all active:scale-95 ${feedback[msg.id]==='miss' ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-70'}`}>💀</button>
                      </div>
                    )}
                    {!msg.streaming && (() => {
                      const qs = extractQuestions(msg.content)
                      if (!qs.length) return null
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                          {qs.map((q,qi) => (
                            <button key={qi} onClick={() => setInput(q)}
                              className="text-xs px-2.5 py-1 rounded-full border border-[#1a2535] text-gray-500 hover:border-[#6C5CE7]/50 hover:text-gray-300 transition-all bg-[#06080f] active:scale-95 text-left">
                              {q}
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {/* ── Waiting / Process indicator ──────────────────────────────────── */}
          {isWaiting && (
            <div className="flex gap-2.5 mb-4 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm border mt-0.5"
                style={{background:'#00FF9D12', borderColor:'#00FF9D35'}}>
                ⚡
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold mb-1 text-[#00FF9D]">GodLocal</div>
                <div className="bg-[#080d14] border border-[#0f1820] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <span className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]"
                        style={{animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>
                    ))}
                  </span>
                  <span className="text-xs text-gray-500">{lang==='uk' ? 'думає...' : lang==='en' ? 'thinking...' : 'думает...'}</span>
                </div>
              </div>
            </div>
          )}
          {activeArchetypes.length > 0 && (
            <div className="flex items-center gap-2 px-1 mb-3 flex-wrap">
              <span className="text-xs text-gray-600">{lang==='uk' ? 'Радники:' : lang==='en' ? 'Advisors:' : 'Советники:'}</span>
              {activeArchetypes.map(aid => {
                const ag = AGENTS.find(a => a.id === aid)
                return ag ? (
                  <span key={aid} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                    style={{borderColor: ag.color+'40', color: ag.color, background: ag.color+'10'}}>
                    <span className="animate-pulse">●</span> {ag.name}
                  </span>
                ) : null
              })}
            </div>
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>



      {/* ── Skills / Task Launcher ─────────────────────────────────────────── */}
      <AnimatePresence>
      {showSkills && (
        <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:300}}
          className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-[#080d14] border-t border-[#1a2535] rounded-t-2xl z-40 pb-safe">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#0f1820]">
            <div>
              <span className="text-sm font-semibold text-[#00FF9D]">⚡ Навыки агента</span>
              <p className="text-xs text-gray-600 mt-0.5">Нажми — задача попадёт в чат</p>
            </div>
            <button onClick={() => setShowSkills(false)} className="text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
          </div>

          {/* Service status bar */}
          <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-none">
            {SERVICES.map(svc => {
              const ok = typeof window !== 'undefined' && !!localStorage.getItem(`gl_${svc.id}`)
              return (
                <button key={svc.id} onClick={() => { setShowSkills(false); setShowAccounts(true) }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap border transition-all ${ok ? 'border-green-900/50 bg-green-900/10 text-green-400' : 'border-[#1a2535] text-gray-600 hover:border-[#2a3545]'}`}>
                  <span>{svc.icon}</span>
                  <span>{svc.name}</span>
                  {ok ? <span className="text-green-500">✓</span> : <span className="text-gray-700">+</span>}
                </button>
              )
            })}
          </div>

          {/* Task grid */}
          <div className="px-4 pb-5 pt-1 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {TASK_TEMPLATES.map(t => {
              const svcOk = !t.svc || (typeof window !== 'undefined' && !!localStorage.getItem(`gl_${t.svc}`))
              return (
                <button key={t.id}
                  onClick={() => {
                    setInput(t.prompt)
                    setShowSkills(false)
                    setTimeout(() => {
                      inputRef.current?.focus()
                      const len = t.prompt.length
                      inputRef.current?.setSelectionRange(len, len)
                    }, 80)
                  }}
                  className={`relative text-left rounded-2xl p-3 border transition-all active:scale-95 ${svcOk ? 'bg-[#0a0e14] border-[#1a2535] hover:border-[#2a3545]' : 'bg-[#080a10] border-[#0f1015] opacity-50'}`}>
                  {!svcOk && (
                    <span className="absolute top-2 right-2 text-[10px] text-gray-700 bg-[#060810] px-1.5 py-0.5 rounded-full border border-[#0f1015]">подключи</span>
                  )}
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="text-xs font-semibold text-gray-300 leading-tight">{t.label}</div>
                  <div className="text-[11px] text-gray-600 mt-0.5 leading-tight">{t.desc}</div>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Memory Panel ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
      {showMemory && (
        <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:300}}
          className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-[#080d14] border-t border-[#1a2535] rounded-t-2xl z-40 pb-safe">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sm font-semibold text-[#00FF9D]">🧠 Память агента</span>
            <button onClick={() => setShowMemory(false)} className="text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
          </div>
          <div className="px-4 pb-4 max-h-64 overflow-y-auto space-y-1.5">
            {memory.length === 0
              ? <p className="text-xs text-gray-600 italic">Память пуста</p>
              : memory.map((m, i) => (
                  <div key={i} className="text-xs text-gray-400 bg-[#0a0e14] px-3 py-2 rounded-lg border border-[#1a2535]">{m}</div>
                ))
            }
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── Artifact Gallery ───────────────────────────────────────────────────── */}
      <AnimatePresence>
      {showArtifacts && (
        <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:30,stiffness:300}}
          className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-[#080d14] border-t border-[#1a2535] rounded-t-2xl z-40 pb-safe">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sm font-semibold text-[#FDCB6E]">☆ Галерея артефактов</span>
            <button onClick={() => setShowArtifacts(false)} className="text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
          </div>
          <div className="px-4 pb-4 max-h-64 overflow-y-auto space-y-2">
            {artifacts.length === 0
              ? <p className="text-xs text-gray-600 italic">Нет сохранённых ответов</p>
              : artifacts.map(a => (
                  <div key={a.id} className="bg-[#0a0e14] border border-[#1a2535] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#FDCB6E] font-semibold">{a.agentName || 'GodLocal'}</span>
                      <button onClick={() => setArtifacts(p => { const n = p.filter(x => x.id !== a.id); try{localStorage.setItem('gl_artifacts',JSON.stringify(n))}catch{}; return n })}
                        className="text-yellow-500 text-xs hover:text-red-400 transition-colors">★ удалить</button>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-3">{a.content.slice(0, 200)}{a.content.length > 200 ? '…' : ''}</p>
                  </div>
                ))
            }
          </div>
        </motion.div>
      )}
      </AnimatePresence>

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
      <div className="shrink-0 px-3 py-2.5"
        style={{paddingBottom:'max(env(safe-area-inset-bottom),12px)', background:'rgba(3,5,8,0.85)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)'}}>
        <div className="flex flex-col bg-[#07090f] border border-[#111827] rounded-2xl overflow-hidden
                        focus-within:border-[#1a2535] transition-colors">

          {/* ── Toolbar row – iOS SF-symbol style ── */}
          <div className="flex items-center gap-1.5 px-3 pt-2 pb-1.5 overflow-x-auto scrollbar-none" style={{flexShrink:0}}>
            {([
              { id:'skills',    label:'Навыки',   color:'#34C759', active: showSkills,
                onClick: () => { setShowSkills((s:boolean)=>!s); setShowAccounts(false); setShowMemory(false); setShowArtifacts(false) } },
              { id:'accounts',  label:'Сервисы',  color:'#5856D6', active: showAccounts,
                onClick: () => { setShowAccounts((a:boolean)=>!a); setShowSkills(false); setShowMemory(false); setShowArtifacts(false) } },
              { id:'memory',    label:'Память',   color:'#007AFF', active: showMemory,
                onClick: () => { setShowMemory((m:boolean)=>!m); setShowSkills(false); setShowAccounts(false); setShowArtifacts(false); if (!showMemory) fetchMemory() } },
              { id:'artifacts', label:'Галерея',  color:'#FF9F0A', active: showArtifacts,
                onClick: () => { setShowArtifacts((a:boolean)=>!a); setShowSkills(false); setShowAccounts(false); setShowMemory(false) } },
            ] as {id:string,label:string,color:string,active:boolean,onClick:()=>void}[]).map(b => (
              <button key={b.id} onClick={b.onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95"
                style={b.active
                  ? {background: b.color, color:'#000', fontWeight:600}
                  : {background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.08)'}}>
                {b.id==='skills'    && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
                {b.id==='accounts'  && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                {b.id==='memory'    && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                {b.id==='artifacts' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
                <span>{b.label}</span>
              </button>
            ))}
          </div>

          {/* ── iOS-style input row ── */}
          <div className="flex items-center gap-2 w-full px-3 py-2">

            {/* Attach – thin SF paperclip */}
            <button onClick={() => fileRef.current?.click()}
              className="shrink-0 flex items-center justify-center w-7 h-7 text-gray-500 active:opacity-50 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.json,.csv"
              className="hidden" onChange={onFileChange} />

            {/* Textarea */}
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              onInput={e => resizeTA(e.currentTarget)}
              placeholder={lang==='uk' ? `Запитай ${activeAgent.name}…` : lang==='en' ? `Ask ${activeAgent.name}…` : `Спроси ${activeAgent.name}…`}
              className="flex-1 bg-transparent resize-none outline-none text-gray-100 placeholder-gray-600 py-0.5"
              rows={1}
              style={{maxHeight:120, overflowY:'auto', minWidth:0, fontSize:'16px', lineHeight:'1.5'}} />

            {/* Voice (Siri orb) OR Send (iOS blue) */}
            {(input.trim() || attachments.length > 0) ? (
              /* iOS Send — blue circle, up arrow */
              <button onClick={send}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{background:'#007AFF', boxShadow:'0 2px 12px rgba(0,122,255,0.45)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            ) : (
              /* Siri-style voice button */
              <button onClick={startVoice}
                className="shrink-0 relative flex items-center justify-center active:scale-90 transition-transform"
                style={{width:36, height:36}}>
                {/* Animated orb when listening */}
                {listening && (
                  <div style={{
                    position:'absolute', inset:0, borderRadius:'50%',
                    background:'conic-gradient(#007AFF,#5856D6,#FF2D55,#FF9F0A,#34C759,#007AFF)',
                    animation:'siriSpin 2.5s linear infinite, siriGlow 1.8s ease-in-out infinite',
                    filter:'blur(0.5px) saturate(1.4)'
                  }} />
                )}
                {/* Inner circle */}
                <div style={{
                  position:'relative', zIndex:1,
                  width: listening ? 28 : 32,
                  height: listening ? 28 : 32,
                  borderRadius:'50%',
                  background: listening ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.08)',
                  border: listening ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  backdropFilter: listening ? 'blur(4px)' : 'none',
                  transition:'all 0.25s ease'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={listening ? 'white' : 'rgba(255,255,255,0.55)'}
                    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </div>
              </button>
            )}
          </div>{/* end items-end row */}
        </div>
      </div>
    </div>
  )
}
