'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────
interface Msg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  streaming?: boolean
  ts: number
  thinkingSteps?: string[]
  thinkingOpen?: boolean
  thinkingDone?: boolean
}

type Mode = 'vibe' | 'debug' | 'refactor' | 'architect' | 'explain'


// ── Chat History Types ──────────────────────────────────────────────────────
interface ChatSession {
  id: string
  title: string
  mode: Mode
  msgs: Msg[]
  createdAt: number
  updatedAt: number
}

const MAX_SESSIONS = 15
const STORAGE_KEY = 'codethinker_sessions'
const ACTIVE_KEY  = 'codethinker_active_session'

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSessions(sessions: ChatSession[]) {
  // Keep only last MAX_SESSIONS, sorted by updatedAt desc
  const trimmed = sessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

function sessionTitle(msgs: Msg[]): string {
  const first = msgs.find(m => m.role === 'user')
  if (!first) return 'Новый чат'
  const text = first.content.slice(0, 50)
  return text.length < first.content.length ? text + '…' : text
}

const MODES: { key: Mode; icon: string; label: string; desc: string }[] = [
  { key: 'vibe',      icon: '🔨', label: 'Vibe Code', desc: 'Опиши идею — получи проект' },
  { key: 'debug',     icon: '🧩', label: 'Debug',     desc: 'Вставь ошибку — найду баг' },
  { key: 'refactor',  icon: '🔄', label: 'Refactor',  desc: 'Оптимизирую и почищу код' },
  { key: 'architect', icon: '📐', label: 'Architect',  desc: 'Спроектирую архитектуру' },
  { key: 'explain',   icon: '📝', label: 'Explain',   desc: 'Объясню чужой код' },
]

const QUICK: Record<Mode, string[]> = {
  vibe:      ['DeFi dashboard на Next.js + Solana', 'Telegram бот для мониторинга крипто', 'CLI tool на Rust для парсинга логов', 'REST API на Go + PostgreSQL'],
  debug:     ['Почему useEffect вызывается дважды?', 'CORS error при fetch запросе', 'Memory leak в Node.js сервере', 'TypeScript: Type X is not assignable to Y'],
  refactor:  ['Оптимизируй мой React компонент', 'Типизируй JavaScript → TypeScript', 'Уменьши сложность O(n²) → O(n)', 'Декомпозируй монолит на модули'],
  architect: ['Микросервисы для e-commerce платформы', 'Real-time чат на WebSocket', 'CI/CD pipeline для монорепо', 'Архитектура мобильного приложения'],
  explain:   ['Что делает этот Solidity контракт?', 'Как работает этот regex?', 'Разбери этот Docker compose', 'Объясни этот SQL запрос'],
}

function uid() { return Math.random().toString(36).slice(2) }


// ── Copy Response Button ────────────────────────────────────────────────────
function CopyResponseBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] font-mono text-violet-400/40 hover:text-violet-300 transition-colors mt-1.5 ml-auto">
      {copied ? (
        <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Скопировано</>
      ) : (
        <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Копировать</>
      )}
    </button>
  )
}

// ── Code Block Renderer ─────────────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-violet-500/20 bg-[#0a0a1a]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-violet-500/10 border-b border-violet-500/15">
        <span className="text-[10px] font-mono text-violet-400/60 uppercase tracking-wider">{lang || 'code'}</span>
        <button onClick={handleCopy} className="text-[10px] font-mono text-violet-400/50 hover:text-violet-300 transition-colors">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-xs font-mono text-violet-200/80 leading-relaxed whitespace-pre">{code}</pre>
    </div>
  )
}

// ── Markdown Renderer ───────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  function inlineRender(line: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let lastIdx = 0; let key = 0; let m: RegExpExecArray | null
    while ((m = linkRe.exec(line)) !== null) {
      if (m.index > lastIdx) parts.push(inlineCode(line.slice(lastIdx, m.index), key++))
      parts.push(
        <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer"
          className="text-violet-400 underline underline-offset-2 hover:text-violet-300 transition-colors break-all">{m[1]}</a>
      )
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < line.length) parts.push(inlineCode(line.slice(lastIdx), key++))
    return parts.length === 1 ? parts[0] : <>{parts}</>
  }

  function inlineCode(text: string, key: number): React.ReactNode {
    const parts: React.ReactNode[] = []
    const codeRe = /`([^`]+)`/g
    let lastIdx = 0; let m: RegExpExecArray | null; let k = 0
    while ((m = codeRe.exec(text)) !== null) {
      if (m.index > lastIdx) parts.push(inlineBold(text.slice(lastIdx, m.index), k++))
      parts.push(<code key={k++} className="bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{m[1]}</code>)
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < text.length) parts.push(inlineBold(text.slice(lastIdx), k++))
    return parts.length === 0 ? text : parts.length === 1 ? parts[0] : <>{parts}</>
  }

  function inlineBold(text: string, key: number): React.ReactNode {
    const parts: React.ReactNode[] = []
    const boldRe = /\*\*(.+?)\*\*/g
    let lastIdx = 0; let m: RegExpExecArray | null; let k = 0
    while ((m = boldRe.exec(text)) !== null) {
      if (m.index > lastIdx) parts.push(<span key={k++}>{text.slice(lastIdx, m.index)}</span>)
      parts.push(<strong key={k++} className="text-white font-semibold">{m[1]}</strong>)
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < text.length) parts.push(<span key={k++}>{text.slice(lastIdx)}</span>)
    return parts.length === 0 ? text : parts.length === 1 ? parts[0] : <>{parts}</>
  }

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { nodes.push(<div key={i} className="h-2" />); i++; continue }
    if (line.startsWith('# '))  { nodes.push(<h1 key={i} className="text-base font-bold text-white mt-3 mb-1">{inlineRender(line.slice(2))}</h1>); i++; continue }
    if (line.startsWith('## ')) { nodes.push(<h2 key={i} className="text-sm font-bold text-violet-200 mt-2 mb-0.5">{inlineRender(line.slice(3))}</h2>); i++; continue }
    if (line.startsWith('### ')){ nodes.push(<h3 key={i} className="text-sm font-semibold text-violet-300/80 mt-1">{inlineRender(line.slice(4))}</h3>); i++; continue }
    if (line.match(/^[-*] /)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(<li key={i} className="flex gap-2 items-start"><span className="text-violet-500/60 mt-0.5 shrink-0">▸</span><span>{inlineRender(lines[i].replace(/^[-*] /,''))}</span></li>)
        i++
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-1 my-1">{items}</ul>); continue
    }
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = []; let num = 1
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} className="flex gap-2 items-start"><span className="text-violet-400/50 shrink-0 w-5 text-right font-mono text-xs">{num}.</span><span>{inlineRender(lines[i].replace(/^\d+\. /,''))}</span></li>)
        i++; num++
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-1 my-1">{items}</ol>); continue
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []; i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      nodes.push(<CodeBlock key={i} code={codeLines.join('\n')} lang={lang} />)
      i++; continue
    }
    if (line.match(/^---+$/)) { nodes.push(<hr key={i} className="border-violet-500/15 my-2" />); i++; continue }
    nodes.push(<p key={i} className="leading-relaxed">{inlineRender(line)}</p>)
    i++
  }
  return nodes
}

// ── Message Content ─────────────────────────────────────────────────────────
function MsgContent({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="text-sm text-gray-300 space-y-0.5 break-words">
      {renderMarkdown(content)}
      {streaming && (
        <span className="inline-flex gap-0.5 ml-1 align-middle">
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse [animation-delay:300ms]" />
        </span>
      )}
    </div>
  )
}

// ── Thinking Steps ──────────────────────────────────────────────────────────
function ThinkingBlock({ steps, open, done, onToggle }: { steps: string[]; open: boolean; done: boolean; onToggle: () => void }) {
  return (
    <div className="mb-2">
      <button onClick={onToggle}
        className="flex items-center gap-2 text-xs text-violet-400/70 hover:text-violet-300 transition-colors font-mono">
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <span>{done ? `Мыслительная цепочка (${steps.length} шагов)` : 'Думаю...'}</span>
        {!done && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2 ml-3 border-l border-violet-500/20 pl-3">
            {steps.map((step, j) => (
              <motion.div key={j} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.05 }}
                className="text-xs text-violet-400/50 font-mono py-0.5 flex items-start gap-2">
                <span className="text-violet-500/40 shrink-0">›</span>
                <span>{step}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function CodeThinkerPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('vibe')
  const [busy, setBusy] = useState(false)
  const [showModes, setShowModes] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions on mount
  useEffect(() => {
    const loaded = loadSessions()
    setSessions(loaded)
    const activeId = localStorage.getItem(ACTIVE_KEY)
    if (activeId) {
      const active = loaded.find(s => s.id === activeId)
      if (active) {
        setMsgs(active.msgs)
        setMode(active.mode)
        setActiveSessionId(active.id)
        setShowModes(active.msgs.length === 0)
      }
    }
  }, [])

  // Auto-save current session when msgs change
  useEffect(() => {
    if (msgs.length === 0) return
    setSessions(prev => {
      let updated: ChatSession[]
      if (activeSessionId) {
        updated = prev.map(s => s.id === activeSessionId
          ? { ...s, msgs, mode, title: sessionTitle(msgs), updatedAt: Date.now() }
          : s
        )
      } else {
        const newSession: ChatSession = {
          id: uid(),
          title: sessionTitle(msgs),
          mode,
          msgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        setActiveSessionId(newSession.id)
        localStorage.setItem(ACTIVE_KEY, newSession.id)
        updated = [newSession, ...prev]
      }
      saveSessions(updated)
      return updated.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS)
    })
  }, [msgs, activeSessionId, mode])

  const startNewChat = useCallback(() => {
    setMsgs([])
    setShowModes(true)
    setActiveSessionId(null)
    localStorage.removeItem(ACTIVE_KEY)
    setSidebarOpen(false)
  }, [])

  const loadSession = useCallback((session: ChatSession) => {
    setMsgs(session.msgs)
    setMode(session.mode)
    setActiveSessionId(session.id)
    setShowModes(session.msgs.length === 0)
    localStorage.setItem(ACTIVE_KEY, session.id)
    setSidebarOpen(false)
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id)
      saveSessions(updated)
      return updated
    })
    if (activeSessionId === id) {
      startNewChat()
    }
  }, [activeSessionId, startNewChat])

  const scroll = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }))
  }, [])

  useEffect(() => { scroll() }, [msgs, scroll])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || busy) return
    setInput('')
    setShowModes(false)

    const userMsg: Msg = { id: uid(), role: 'user', content: msg, ts: Date.now() }
    const aiMsg: Msg = { id: uid(), role: 'ai', content: '', streaming: true, ts: Date.now(), thinkingSteps: [], thinkingOpen: true, thinkingDone: false }
    setMsgs(prev => [...prev, userMsg, aiMsg])
    setBusy(true)

    try {
      const history = msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }))

      const res = await fetch('/api/codethinker/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history, session_id: typeof window !== 'undefined' ? localStorage.getItem('codethinker_session_id') || '' : '', mode }),
      })

      if (!res.ok || !res.body) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          const wait = data.retry_after || 60
          throw new Error(`⏳ Лимит запросов исчерпан. Подожди ${wait} сек и попробуй снова.`)
        }
        const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error === 'API key not configured' ? 'API key not configured' : 'API error')
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let full = ''
      const steps: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        full += chunk

        const thinkMatch = chunk.match(/【(.+?)】/g)
        if (thinkMatch) thinkMatch.forEach(m => steps.push(m.replace(/[【】]/g, '')))

        setMsgs(prev => prev.map(m => m.id === aiMsg.id ? {
          ...m, content: full.replace(/【.+?】/g, '').trim(), thinkingSteps: [...steps], thinkingDone: false
        } : m))
      }

      setMsgs(prev => prev.map(m => m.id === aiMsg.id ? {
        ...m, content: full.replace(/【.+?】/g, '').trim(), streaming: false, thinkingSteps: [...steps], thinkingDone: true, thinkingOpen: steps.length > 0
      } : m))

    } catch (e: unknown) {
      setMsgs(prev => prev.map(m => m.id === aiMsg.id ? {
        ...m, content: e instanceof Error && e.message.startsWith('⏳')
          ? e.message
          : e instanceof Error && e.message.includes('API key')
          ? '⚠️ GROQ_API_KEY не настроен. Добавь ключ в переменные окружения Vercel.'
          : '⚠️ Ошибка соединения. Попробуй ещё раз.', streaming: false, thinkingDone: true
      } : m))
    } finally { setBusy(false) }
  }, [input, busy, msgs, mode])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const activeMode = MODES.find(m => m.key === mode)!

  return (
    <div className="h-dvh flex flex-col bg-[#06060e] text-white overflow-hidden">

      {/* ── Sidebar Overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] bg-[#0a0a1a] border-r border-violet-500/15 z-50 flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-violet-500/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="text-sm font-bold text-white">История</span>
                  <span className="text-[10px] font-mono text-violet-400/40">{sessions.length}/{MAX_SESSIONS}</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-violet-400/40 hover:text-violet-300 transition-colors p-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* New Chat Button */}
              <button onClick={startNewChat}
                className="mx-3 mt-3 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/20 transition-all text-sm text-violet-300 font-medium">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Новый чат
              </button>

              {/* Search */}
              <div className="px-3 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full bg-white/[0.04] border border-violet-500/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/25 font-mono"
                />
              </div>

              {/* Session List */}
              <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                {sessions
                  .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(session => (
                    <div key={session.id}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        session.id === activeSessionId
                          ? 'bg-violet-500/15 border border-violet-500/20'
                          : 'hover:bg-white/[0.04] border border-transparent'
                      }`}
                      onClick={() => loadSession(session)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate ${session.id === activeSessionId ? 'text-violet-200 font-medium' : 'text-gray-400'}`}>
                          {session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-mono text-violet-500/40">
                            {new Date(session.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[9px] text-violet-500/30">
                            {session.msgs.filter(m => m.role === 'user').length} сообщ.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-violet-400/30 hover:text-red-400/70 transition-all p-1"
                        title="Удалить"
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
                }
                {sessions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-gray-600 font-mono">Пока пусто</p>
                    <p className="text-[10px] text-gray-700 mt-1">Начни чат — он сохранится автоматически</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-violet-500/10">
                <p className="text-[9px] text-gray-700 font-mono text-center">Хранится в браузере · Макс. {MAX_SESSIONS} чатов</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-violet-500/10 bg-[#06060e]/90 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-violet-400 hover:text-violet-300 transition-colors p-1">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <Link href="/" className="text-violet-400 hover:text-violet-300 transition-colors">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">CodeThinker</h1>
              <p className="text-[10px] text-violet-400/60 font-mono">AI думает кодом</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            busy ? 'text-amber-400/70 border-amber-500/25 bg-amber-500/10' : 'text-violet-400/70 border-violet-500/25 bg-violet-500/10'
          }`}>
            {busy ? '⚡ thinking' : '● ready'}
          </span>
          <button onClick={startNewChat}
            className="text-violet-400/40 hover:text-violet-300 transition-colors p-1" title="New chat">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </header>

      {/* ── Messages Area ───────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth">

        {showModes && msgs.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto pt-8 md:pt-16">

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                Code<span className="text-violet-400">Thinker</span>
              </h2>
              <p className="text-gray-500 text-sm">Chain-of-thought AI для разработчиков</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {MODES.map(m => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    mode === m.key
                      ? 'bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-lg shadow-violet-500/10'
                      : 'bg-white/[0.02] border-white/10 text-gray-400 hover:bg-white/[0.05] hover:text-gray-300'
                  }`}>
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div className="text-center mb-6">
              <p className="text-violet-400/80 text-sm font-medium">{activeMode.icon} {activeMode.desc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK[mode].map((q, idx) => (
                <motion.button key={`${mode}-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  onClick={() => send(q)}
                  className="group text-left px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-violet-500/[0.08] hover:border-violet-500/20 transition-all">
                  <span className="text-xs text-gray-400 group-hover:text-violet-300 transition-colors leading-snug">{q}</span>
                  <span className="text-violet-500/0 group-hover:text-violet-500/50 text-xs ml-1 transition-colors">→</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {msgs.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`max-w-3xl mx-auto ${msg.role === 'user' ? 'flex justify-end' : ''}`}>

            {msg.role === 'user' ? (
              <div className="bg-violet-500/15 border border-violet-500/20 rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
                <p className="text-sm text-violet-200 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                  <ThinkingBlock
                    steps={msg.thinkingSteps}
                    open={!!msg.thinkingOpen}
                    done={!!msg.thinkingDone}
                    onToggle={() => setMsgs(prev => prev.map(m => m.id === msg.id ? { ...m, thinkingOpen: !m.thinkingOpen } : m))}
                  />
                )}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                  <MsgContent content={msg.content} streaming={msg.streaming} />
                  {!msg.streaming && msg.content && <CopyResponseBtn text={msg.content} />}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Input Area ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-violet-500/10 bg-[#06060e]/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {!showModes && (
            <div className="flex items-center gap-2 mb-2">
              {MODES.map(m => (
                <button key={m.key} onClick={() => setMode(m.key)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                    mode === m.key
                      ? 'text-violet-300 border-violet-500/30 bg-violet-500/15'
                      : 'text-gray-600 border-transparent hover:text-gray-400'
                  }`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={activeMode.desc + '...'}
                rows={1}
                className="w-full bg-white/[0.04] border border-violet-500/15 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20 resize-none font-mono transition-all"
              />
            </div>
            <button onClick={() => send()} disabled={busy || !input.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/25 flex items-center justify-center text-violet-400 hover:bg-violet-500/30 hover:text-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              {busy ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              ) : (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-700 text-center mt-2 font-mono">CodeThinker · Chain-of-Thought AI · GodLocal</p>
        </div>
      </div>
    </div>
  )
}
