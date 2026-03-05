'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const OasisAvatar = dynamic(() => import('@/components/OasisAvatar'), { ssr: false })

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE  = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')

interface Msg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  streaming?: boolean
  ts: number
  image?: string
  thinkingSteps?: string[]
  thinkingOpen?: boolean
  thinkingDone?: boolean
}

const QUICK = [
  'Что с Bitcoin сейчас?',
  'Стратегия запуска продукта',
  'Последние AI новости 2026',
  'Что такое GodLocal?',
]

function uid() { return Math.random().toString(36).slice(2) }

// -- Markdown renderer ------------------------------------------------------
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  function inlineRender(line: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let lastIdx = 0; let key = 0; let m: RegExpExecArray | null
    while ((m = linkRe.exec(line)) !== null) {
      if (m.index > lastIdx) parts.push(inlineBold(line.slice(lastIdx, m.index), key++))
      parts.push(
        <a key={key++} href={m[2]} target="_blank" rel="noopener noreferrer"
          className="text-[#00FF9D] underline underline-offset-2 hover:text-[#00FF9D]/80 transition-colors break-all">{m[1]}</a>
      )
      lastIdx = m.index + m[0].length
    }
    if (lastIdx < line.length) parts.push(inlineBold(line.slice(lastIdx), key++))
    return parts.length === 1 ? parts[0] : <>{parts}</>
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
    if (line.startsWith('# '))  { nodes.push(<h1 key={i} className="text-base font-bold text-white mt-2 mb-1">{inlineRender(line.slice(2))}</h1>); i++; continue }
    if (line.startsWith('## ')) { nodes.push(<h2 key={i} className="text-sm font-bold text-white/90 mt-2 mb-0.5">{inlineRender(line.slice(3))}</h2>); i++; continue }
    if (line.startsWith('### ')){ nodes.push(<h3 key={i} className="text-sm font-semibold text-white/75 mt-1">{inlineRender(line.slice(4))}</h3>); i++; continue }
    if (line.match(/^[\-*\u2022] /)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^[\-*\u2022] /)) {
        items.push(<li key={i} className="flex gap-2 items-start"><span className="text-[#00FF9D]/60 mt-0.5 shrink-0">&middot;</span><span>{inlineRender(lines[i].replace(/^[\-*\u2022] /,''))}</span></li>)
        i++
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-1 my-1">{items}</ul>); continue
    }
    if (line.match(/^\d+\. /)) {
      const items: React.ReactNode[] = []; let num = 1
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} className="flex gap-2 items-start"><span className="text-[#00FF9D]/50 shrink-0 w-5 text-right">{num}.</span><span>{inlineRender(lines[i].replace(/^\d+\. /,''))}</span></li>)
        i++; num++
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-1 my-1">{items}</ol>); continue
    }
    if (line.startsWith('```')) {
      const codeLines: string[] = []; i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      nodes.push(<pre key={i} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 my-2 overflow-x-auto text-xs font-mono text-[#00FF9D]/80 leading-relaxed">{codeLines.join('\n')}</pre>)
      i++; continue
    }
    if (line.match(/^---+$/)) { nodes.push(<hr key={i} className="border-white/10 my-2" />); i++; continue }
    nodes.push(<p key={i} className="leading-relaxed">{inlineRender(line)}</p>)
    i++
  }
  return nodes
}

function MsgContent({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="text-sm space-y-0.5">
      {renderMarkdown(content)}
      {streaming && <span className="inline-block w-1.5 h-4 bg-[#00FF9D] rounded-sm ml-0.5 animate-pulse align-middle" />}
    </div>
  )
}

// -- ThinkingBlock ----------------------------------------------------------
function ThinkingBlock({
  steps, streaming, open, onToggle,
}: {
  steps: string[]; streaming?: boolean; open: boolean; onToggle: () => void
}) {
  if (!steps || steps.length === 0) return null
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-[10px] font-mono px-2.5 py-1 rounded-full border border-[#00FF9D]/15 bg-[#00FF9D]/5 text-[#00FF9D]/50 hover:text-[#00FF9D]/80 hover:border-[#00FF9D]/30 transition-all"
      >
        {streaming
          ? <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]/70 animate-pulse" />
          : <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]/35" />}
        {streaming ? 'Думает...' : `Процесс мышления · ${steps.length} шагов`}
        <span className="opacity-40">{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="mt-1.5 px-3 py-2.5 bg-black/40 border border-white/8 rounded-xl font-mono text-[10px] md:text-[11px] text-white/40 leading-relaxed space-y-1 max-h-52 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,157,0.1) transparent' }}
            >
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#00FF9D]/25 shrink-0 select-none">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-white/45 break-words">{s}</span>
                </div>
              ))}
              {streaming && (
                <div className="flex gap-2 items-center">
                  <span className="text-[#00FF9D]/25 shrink-0">--</span>
                  <span className="inline-flex gap-1">
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-[#00FF9D]/40 animate-bounce"
                        style={{ animationDelay: `${d}s` }} />
                    ))}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
export default function OasisPage() {
  const [msgs, setMsgs]                 = useState<Msg[]>([])
  const [input, setInput]               = useState('')
  const [connected, setConnected]       = useState(false)
  const [loading, setLoading]           = useState(false)
  const [imgPreview, setImgPreview]     = useState<string | null>(null)
  const [imgBase64, setImgBase64]       = useState<string | null>(null)

  const wsRef     = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  const scroll = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(scroll, [msgs])

  const isTalking = loading || (msgs.length > 0 &&
    msgs[msgs.length - 1]?.role === 'ai' &&
    msgs[msgs.length - 1]?.streaming === true)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(`${WS_BASE}/ws/oasis`)
    wsRef.current = ws
    ws.onopen  = () => setConnected(true)
    ws.onclose = () => { setConnected(false); setTimeout(connect, 4000) }
    ws.onerror = () => ws.close()
    ws.onmessage = (e) => {
      const d    = JSON.parse(e.data)
      const type = d.t || d.type
      const val  = d.v ?? d.content ?? ''

      if (type === 'thinking_start') {
        // Spawn AI message stub with empty thinking
        setMsgs(prev => [
          ...prev,
          { id: uid(), role: 'ai', content: '', streaming: true,
            thinkingSteps: [], thinkingOpen: true, thinkingDone: false, ts: Date.now() }
        ])

      } else if (type === 'thinking') {
        setMsgs(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'ai')
            return [...prev.slice(0, -1), {
              ...last, thinkingSteps: [...(last.thinkingSteps || []), val]
            }]
          return prev
        })

      } else if (type === 'thinking_done') {
        setMsgs(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'ai')
            return [...prev.slice(0, -1), {
              ...last, thinkingDone: true, thinkingOpen: false
            }]
          return prev
        })

      } else if (type === 'token') {
        setMsgs(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'ai' && last.streaming)
            return [...prev.slice(0, -1), { ...last, content: last.content + val }]
          return [...prev, { id: uid(), role: 'ai', content: val, streaming: true,
                             thinkingSteps: [], thinkingOpen: false, thinkingDone: true, ts: Date.now() }]
        })

      } else if (type === 'done') {
        setMsgs(prev => {
          const l = prev[prev.length - 1]
          if (l?.role === 'ai') return [...prev.slice(0, -1), { ...l, streaming: false }]
          return prev
        })
        setLoading(false)

      } else if (type === 'error') {
        setMsgs(prev => [...prev, { id: uid(), role: 'system', content: '⚠️ ' + val, ts: Date.now() }])
        setLoading(false)

      } else if (type === 'tool_start' || type === 'tool_done') {
        setMsgs(prev => [...prev, { id: uid(), role: 'system', content: val, ts: Date.now() }])
      }
    }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/ping`).catch(() => {})
    const t = setTimeout(connect, 800)
    return () => clearTimeout(t)
  }, [connect])

  const send = useCallback((text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg && !imgBase64) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setMsgs(prev => [...prev, { id: uid(), role: 'user', content: msg,
                                image: imgPreview ?? undefined, ts: Date.now() }])
    setInput('')
    setLoading(true)
    wsRef.current.send(JSON.stringify({ message: msg, image_base64: imgBase64 ?? undefined }))
    setImgPreview(null); setImgBase64(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [input, imgBase64, imgPreview])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result as string
      setImgPreview(r); setImgBase64(r.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const toggleThinking = (id: string) =>
    setMsgs(prev => prev.map(m => m.id === id ? { ...m, thinkingOpen: !m.thinkingOpen } : m))

  return (
    <div
      className="flex flex-col h-screen text-[#E0E0E0] font-sans relative overflow-hidden"
      style={{ backgroundImage: 'url(/oasis-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-0" />

      {/* Live2D Avatar */}
      <OasisAvatar talking={isTalking} />

      {/* Header */}
      <header className="relative z-10 shrink-0 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-lg md:text-xl">⚡</span>
          <span className="font-bold text-white tracking-tight text-sm md:text-base">GodLocal</span>
          <span className="text-[10px] md:text-xs font-mono text-[#00FF9D]/70 border border-[#00FF9D]/25 px-2 py-0.5 rounded-full">OASIS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${connected ? 'bg-[#00FF9D] animate-pulse' : 'bg-white/25'}`} />
          <span className="text-[10px] md:text-xs text-white/35 font-mono hidden sm:block">{connected ? 'online' : 'connecting…'}</span>
          <a href="/oasis/settings" title="Настройки"
             className="ml-1 w-7 h-7 flex items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/30 hover:text-white/70 hover:bg-white/10 hover:border-white/20 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 1 21 12a10 10 0 0 1-1.93 7.07M4.93 4.93A10 10 0 0 0 3 12a10 10 0 0 0 1.93 7.07"/>
              <path d="m16.24 7.76-1.22 1.22M7.76 16.24l-1.22 1.22M16.24 16.24l-1.22-1.22M7.76 7.76 6.54 6.54"/>
            </svg>
          </a>
        </div>
      </header>

      {/* Main layout */}
      <div className="relative z-10 flex flex-1 overflow-hidden justify-center">
        <div className="flex flex-col w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 md:py-6 space-y-3 md:space-y-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,157,0.15) transparent' }}>

            {msgs.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center h-full gap-6 md:gap-10 pb-12"
              >
                <div className="text-center px-4">
                  <motion.div className="text-4xl md:text-6xl mb-3 md:mb-5"
                    animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
                    ⚡
                  </motion.div>
                  <h1 className="text-xl md:text-3xl font-bold text-white mb-2 tracking-tight">GodLocal OASIS</h1>
                  <p className="text-white/45 text-xs md:text-sm">Твой AI — с памятью, поиском и инструментами</p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs md:max-w-md px-2">
                  {QUICK.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-left text-[11px] md:text-xs px-3 py-2.5 md:py-3 rounded-xl border border-white/10 bg-black/30 hover:bg-[#00FF9D]/10 hover:border-[#00FF9D]/35 transition-all text-white/50 hover:text-white/85 leading-snug backdrop-blur-sm">
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {msgs.map(m => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'system' ? (
                    <span className="text-[10px] md:text-xs text-white/25 font-mono px-3 py-1 rounded-full bg-black/30 border border-white/8 backdrop-blur-sm">
                      {m.content}
                    </span>
                  ) : (
                    <div className={`max-w-[88%] md:max-w-[78%] ${m.role === 'user' ? 'order-2' : ''}`}>
                      {m.image && <img src={m.image} alt="" className="rounded-xl mb-2 max-h-44 md:max-h-56 object-cover" />}

                      {/* ThinkingBlock — only for AI messages */}
                      {m.role === 'ai' && (
                        <ThinkingBlock
                          steps={m.thinkingSteps || []}
                          streaming={!m.thinkingDone}
                          open={m.thinkingOpen || false}
                          onToggle={() => toggleThinking(m.id)}
                        />
                      )}

                      <div className={`rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 ${
                        m.role === 'user'
                          ? 'bg-[#00FF9D]/15 border border-[#00FF9D]/25 text-white ml-auto backdrop-blur-sm'
                          : 'bg-black/45 border border-white/12 text-[#E8E8E8] backdrop-blur-sm'
                      }`}>
                        {m.role === 'user'
                          ? <span className="text-sm leading-relaxed">{m.content}</span>
                          : <MsgContent content={m.content} streaming={m.streaming} />}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && msgs[msgs.length - 1]?.role !== 'ai' && (
              <div className="flex justify-start">
                <div className="bg-black/45 border border-white/12 backdrop-blur-sm rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]/60 animate-bounce"
                        style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Image preview */}
          <AnimatePresence>
            {imgPreview && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="shrink-0 px-3 md:px-4 pb-2">
                <div className="relative inline-block">
                  <img src={imgPreview} alt="" className="h-16 md:h-20 rounded-xl object-cover border border-white/15" />
                  <button onClick={() => { setImgPreview(null); setImgBase64(null) }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white/25 hover:bg-white/45 text-xs flex items-center justify-center transition-all">✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="shrink-0 px-3 md:px-4 pb-4 md:pb-6 pt-2">
            <div className="flex items-end gap-2 bg-black/50 border border-white/15 rounded-2xl px-3 md:px-4 py-2.5 md:py-3 focus-within:border-[#00FF9D]/40 transition-all backdrop-blur-md shadow-lg shadow-black/30">
              <button onClick={() => fileRef.current?.click()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-white/35 hover:text-white/65 hover:bg-white/10 transition-all"
                title="Прикрепить изображение">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                placeholder="Напиши что-нибудь…" rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder-white/30 leading-relaxed max-h-28 md:max-h-36 overflow-y-auto py-0.5"
                style={{ scrollbarWidth: 'none' }} />
              <button onClick={() => send()}
                disabled={(!input.trim() && !imgBase64) || !connected}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#00FF9D]/20 border border-[#00FF9D]/40 text-[#00FF9D] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#00FF9D]/35 hover:border-[#00FF9D]/60 transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>
                </svg>
              </button>
            </div>
            <p className="text-center text-[9px] md:text-[10px] text-white/18 mt-1.5 font-mono">
              Enter — отправить &middot; Shift+Enter — новая строка
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
