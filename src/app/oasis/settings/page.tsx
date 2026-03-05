'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'

interface ServiceConfig {
  id: string
  name: string
  icon: string
  color: string
  description: string
  fields: {
    key: string
    label: string
    placeholder: string
    type?: string
    hint?: string
  }[]
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: '#0088cc',
    description: 'Отправлять сообщения в каналы и ботам',
    fields: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', placeholder: '1234567890:AAF...', hint: 'Получить у @BotFather' },
      { key: 'TELEGRAM_CHAT_ID',   label: 'Chat ID (канал)', placeholder: '@mychannel или -1001234567890', hint: 'Username канала или числовой ID' },
    ]
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    icon: '𝕏',
    color: '#000000',
    description: 'Публиковать твиты и искать новости',
    fields: [
      { key: 'TWITTER_API_KEY',        label: 'API Key',            placeholder: 'xxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'TWITTER_API_SECRET',     label: 'API Secret',         placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'TWITTER_ACCESS_TOKEN',   label: 'Access Token',       placeholder: 'xxxxxxxx-xxxxxxxxxxxxxx' },
      { key: 'TWITTER_ACCESS_SECRET',  label: 'Access Token Secret',placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'TWITTER_BEARER_TOKEN',   label: 'Bearer Token',       placeholder: 'AAAAAAAAAAAAAAAAAAAAAxxxxx', type: 'password', hint: 'Для поиска твитов' },
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    color: '#6e40c9',
    description: 'Читать и обновлять репозитории',
    fields: [
      { key: 'GITHUB_TOKEN', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx', type: 'password', hint: 'Settings → Developer settings → Personal access tokens' },
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    description: 'Публиковать посты в бизнес-аккаунт',
    fields: [
      { key: 'INSTAGRAM_ACCESS_TOKEN', label: 'Access Token', placeholder: 'EAAxxxxxxxx', type: 'password', hint: 'Meta for Developers → Graph API' },
      { key: 'INSTAGRAM_USER_ID',      label: 'Instagram User ID', placeholder: '17841400000000000', hint: 'Числовой ID страницы' },
    ]
  },
  {
    id: 'groq',
    name: 'Groq AI',
    icon: '⚡',
    color: '#F55036',
    description: 'Языковая модель для OASIS агента',
    fields: [
      { key: 'GROQ_API_KEY', label: 'API Key', placeholder: 'gsk_xxxxxxxxxxxxxxxxxxxx', type: 'password', hint: 'console.groq.com/keys' },
    ]
  },
  {
    id: 'serper',
    name: 'Serper Search',
    icon: '🌐',
    color: '#4285F4',
    description: 'Google-поиск для агента (опционально)',
    fields: [
      { key: 'SERPER_API_KEY', label: 'API Key', placeholder: 'xxxxxxxxxxxxxxxxxxxx', type: 'password', hint: 'serper.dev — 2500 бесплатных запросов/мес' },
    ]
  },
]

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
  return (
    <span className={`w-2 h-2 rounded-full inline-block ${ok ? 'bg-[#00FF9D] animate-pulse' : 'bg-white/25'}`} />
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [values, setValues]     = useState<Record<string, string>>({})
  const [saved,  setSaved]      = useState<Record<string, boolean>>({})
  const [status, setStatus]     = useState<Record<string, boolean | null>>({})
  const [saving, setSaving]     = useState(false)
  const [toast,  setToast]      = useState<string | null>(null)
  const [sid,    setSid]        = useState<string>('')
  const [show,   setShow]       = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Use localStorage session_id (same as chat page)
    let s = localStorage.getItem('oasis_session_id')
    if (!s) { s = Math.random().toString(36).slice(2); localStorage.setItem('oasis_session_id', s) }
    setSid(s)
    // Load saved keys
    fetch(`${API_BASE}/settings?session_id=${s}`)
      .then(r => r.json())
      .then(data => {
        if (data.keys) {
          setValues(data.keys)
          // Mark which services are connected
          const st: Record<string, boolean | null> = {}
          SERVICES.forEach(svc => {
            const filled = svc.fields.every(f => !!data.keys[f.key])
            st[svc.id] = filled ? true : null
          })
          setStatus(st)
        }
      })
      .catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const saveService = async (svc: ServiceConfig) => {
    setSaving(true)
    const payload: Record<string, string> = {}
    svc.fields.forEach(f => { if (values[f.key]) payload[f.key] = values[f.key] })
    try {
      const r = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, keys: payload })
      })
      const d = await r.json()
      if (d.ok) {
        setSaved(prev => ({ ...prev, [svc.id]: true }))
        setStatus(prev => ({ ...prev, [svc.id]: svc.fields.every(f => !!values[f.key]) ? true : null }))
        showToast(`${svc.name} сохранён ✓`)
      }
    } catch {
      showToast('Ошибка сохранения')
    }
    setSaving(false)
  }

  const disconnect = async (svc: ServiceConfig) => {
    const payload: Record<string, string> = {}
    svc.fields.forEach(f => { payload[f.key] = '' })
    setValues(prev => ({ ...prev, ...payload }))
    setStatus(prev => ({ ...prev, [svc.id]: null }))
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid, keys: payload })
      })
    } catch {}
    showToast(`${svc.name} отключён`)
  }

  return (
    <div
      className="min-h-screen text-[#E0E0E0] font-sans relative overflow-hidden"
      style={{ backgroundImage: 'url(/oasis-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] z-0" />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Header */}
        <header className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/oasis')}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-base tracking-tight">Подключения</h1>
            <p className="text-white/35 text-xs font-mono">OASIS Agent · Integrations</p>
          </div>
        </header>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-2xl bg-[#00FF9D]/5 border border-[#00FF9D]/15 text-xs text-white/50 leading-relaxed"
        >
          🔐 Ключи хранятся <strong className="text-white/70">на сервере по session_id</strong> — никто кроме вас не имеет доступа. Агент использует их автоматически во время чата.
        </motion.div>

        {/* Services */}
        <div className="space-y-3">
          {SERVICES.map((svc, idx) => {
            const isConnected = status[svc.id] === true
            const anyFilled   = svc.fields.some(f => values[f.key])
            return (
              <motion.div key={svc.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden"
              >
                {/* Service header */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-xl w-7 text-center leading-none">{svc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{svc.name}</span>
                      <StatusDot ok={status[svc.id] ?? null} />
                      {isConnected && <span className="text-[10px] font-mono text-[#00FF9D]/60 border border-[#00FF9D]/20 px-1.5 py-0.5 rounded-full">connected</span>}
                    </div>
                    <p className="text-white/35 text-xs mt-0.5">{svc.description}</p>
                  </div>
                  {isConnected && (
                    <button onClick={() => disconnect(svc)}
                      className="text-[10px] text-white/30 hover:text-red-400/60 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                      отключить
                    </button>
                  )}
                </div>

                {/* Fields */}
                <div className="px-4 pb-4 space-y-2.5">
                  {svc.fields.map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] text-white/35 font-mono uppercase tracking-wide mb-1 block">
                        {f.label}
                        {f.hint && <span className="normal-case ml-1.5 opacity-60">· {f.hint}</span>}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={show[f.key] ? 'text' : (f.type || 'text')}
                          value={values[f.key] || ''}
                          onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-black/30 border border-white/10 focus:border-[#00FF9D]/30 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 outline-none transition-all font-mono pr-8"
                        />
                        {f.type === 'password' && (
                          <button type="button"
                            onClick={() => setShow(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                            className="absolute right-2 text-white/25 hover:text-white/50 transition-colors">
                            {show[f.key]
                              ? <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                              : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => saveService(svc)}
                    disabled={saving || !anyFilled}
                    className="w-full mt-1 py-2 rounded-xl text-xs font-semibold transition-all
                      bg-[#00FF9D]/10 border border-[#00FF9D]/20 text-[#00FF9D]/70
                      hover:bg-[#00FF9D]/20 hover:border-[#00FF9D]/40 hover:text-[#00FF9D]
                      disabled:opacity-25 disabled:cursor-not-allowed active:scale-98"
                  >
                    {saved[svc.id] ? '✓ Сохранено' : 'Сохранить'}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/15 font-mono mt-8">
          OASIS Agent v18.0 · godlocal.ai
        </p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#00FF9D]/15 border border-[#00FF9D]/30 text-[#00FF9D] text-xs font-mono backdrop-blur-md shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
