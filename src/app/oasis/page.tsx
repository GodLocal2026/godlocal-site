'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE  = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://')

interface Msg {
  id: string
  role: 'user' | 'ai' | 'system'
  content: string
  streaming?: boolean
  ts: number
  image?: string
}

const QUICK = [
  'Что с Bitcoin сейчас?',
  'Стратегия запуска продукта',
  'Последние AI новости 2026',
  'Что такое GodLocal?',
]

function uid() { return Math.random().toString(36).slice(2) }

export default function OasisPage() {
  const [msgs, setMsgs]         = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgBase64, setImgBase64]   = useState<string | null>(null)

  const wsRef      = useRef<WebSocket | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)

  const scroll = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(scroll, [msgs])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(`${WS_BASE}/ws/oasis`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, 4000)
    }
    ws.onerror = () => ws.close()

    ws.onmessage = (e) => {
      const d = JSON.parse(e.data)
      const type = d.t || d.type
      const val  = d.v ?? d.content ?? ''

      if (type === 'token') {
        setMsgs(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'ai' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + val }]
          }
          return [...prev, { id: uid(), role: 'ai', content: val, streaming: true, ts: Date.now() }]
        })
      } else if (type === 'done') {
        setMsgs(prev => {
          const last = prev[prev.length - 1]
          if (last?.role === 'ai') return [...prev.slice(0, -1), { ...last, streaming: false }]
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

    setMsgs(prev => [...prev, {
      id: uid(), role: 'user', content: msg,
      image: imgPreview ?? undefined, ts: Date.now()
    }])
    setInput('')
    setLoading(true)

    wsRef.current.send(JSON.stringify({
      message: msg,
      image_base64: imgBase64 ?? undefined,
    }))

    setImgPreview(null)
    setImgBase64(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [input, imgBase64, imgPreview])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImgPreview(result)
      setImgBase64(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0C0F] text-[#E0E0E0] font-sans">

      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0A0C0F]/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <span className="font-bold text-white tracking-tight">GodLocal</span>
          <span className="text-xs font-mono text-[#00FF9D]/60 border border-[#00FF9D]/20 px-2 py-0.5 rounded-full">OASIS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00FF9D] animate-pulse' : 'bg-white/20'}`} />
          <span className="text-xs text-white/30 font-mono">{connected ? 'online' : 'connecting…'}</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {msgs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-8 pb-16"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h1 className="text-2xl font-bold text-white mb-2">GodLocal OASIS</h1>
              <p className="text-white/40 text-sm">Твой AI — с памятью, поиском и инструментами</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
              {QUICK.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/7 hover:border-[#00FF9D]/30 transition-all text-white/50 hover:text-white/80"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {msgs.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'system' ? (
                <span className="text-xs text-white/25 font-mono px-3 py-1 rounded-full bg-white/3 border border-white/5">
                  {m.content}
                </span>
              ) : (
                <div className={`max-w-[78%] ${m.role === 'user' ? 'order-2' : ''}`}>
                  {m.image && (
                    <img src={m.image} alt="" className="rounded-xl mb-2 max-h-48 object-cover" />
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#00FF9D]/12 border border-[#00FF9D]/20 text-white ml-auto'
                      : 'bg-white/5 border border-white/8 text-[#E0E0E0]'
                  }`}>
                    {m.content}
                    {m.streaming && (
                      <span className="inline-block w-1.5 h-4 bg-[#00FF9D] rounded-sm ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && msgs[msgs.length - 1]?.role !== 'ai' && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]/50 animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {imgPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 px-4 pb-2"
          >
            <div className="relative inline-block">
              <img src={imgPreview} alt="" className="h-20 rounded-xl object-cover border border-white/10" />
              <button
                onClick={() => { setImgPreview(null); setImgBase64(null) }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 text-xs flex items-center justify-center transition-all"
              >×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 px-4 pb-5 pt-2">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#00FF9D]/30 transition-all">
          <button
            onClick={() => fileRef.current?.click()}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/8 transition-all"
            title="Прикрепить изображение"
          >
            📎
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Напиши что-нибудь…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-white placeholder-white/25 leading-relaxed max-h-32 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}
          />

          <button
            onClick={() => send()}
            disabled={(!input.trim() && !imgBase64) || !connected}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#00FF9D]/15 border border-[#00FF9D]/30 text-[#00FF9D] disabled:opacity-25 disabled:cursor-not-allowed hover:bg-[#00FF9D]/25 transition-all"
          >
            ↑
          </button>
        </div>
        <p className="text-center text-[10px] text-white/15 mt-2 font-mono">Enter — отправить · Shift+Enter — новая строка</p>
      </div>
    </div>
  )
}
