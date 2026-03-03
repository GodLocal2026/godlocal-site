'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface Channel { id: string; name: string; icon: string; description: string }
interface Message { id: string; channel_id: string; user_id: string; username: string; content: string; is_ai: boolean; created_at: string }

const COLORS = ['#00FF9D','#00B4D8','#6C5CE7','#FD79A8','#FDCB6E','#E17055','#55EFC4','#74B9FF']
function userColor(uid: string) { let h = 0; for (let i=0;i<uid.length;i++) h = (h*31+uid.charCodeAt(i))&0xFFFF; return COLORS[h%COLORS.length] }
function uid() { return 'u_' + Math.random().toString(36).slice(2,10) }
function timeStr(iso: string) { const d = new Date(iso); return d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) }

export default function NebuddaPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel|null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [username, setUsername] = useState('')
  const [myId, setMyId] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const subRef = useRef<ReturnType<typeof supabase.channel>|null>(null)

  // Init identity
  useEffect(() => {
    let id = localStorage.getItem('nebudda_uid') || uid()
    let name = localStorage.getItem('nebudda_name') || 'Anonim_' + id.slice(-4)
    localStorage.setItem('nebudda_uid', id)
    localStorage.setItem('nebudda_name', name)
    setMyId(id); setUsername(name)
  }, [])

  // Load channels
  useEffect(() => {
    supabase.from('nebudda_channels').select('*').order('created_at').then(({ data }) => {
      if (data) { setChannels(data); if (data.length) setActiveChannel(data[0]) }
    })
  }, [])

  // Load + subscribe to messages
  useEffect(() => {
    if (!activeChannel) return
    setMessages([])

    // Fetch history
    supabase.from('nebudda_messages')
      .select('*').eq('channel_id', activeChannel.id)
      .order('created_at').limit(100)
      .then(({ data }) => { if (data) setMessages(data) })

    // Realtime subscription
    if (subRef.current) supabase.removeChannel(subRef.current)
    const sub = supabase.channel('nebudda_' + activeChannel.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'nebudda_messages',
        filter: `channel_id=eq.${activeChannel.id}`
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new as Message]
        })
      }).subscribe()
    subRef.current = sub
    return () => { supabase.removeChannel(sub) }
  }, [activeChannel])

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, aiThinking])

  const saveName = () => {
    const n = nameInput.trim() || username
    localStorage.setItem('nebudda_name', n); setUsername(n); setEditingName(false)
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || !activeChannel || !myId) return
    setInput('')

    // Insert user message
    await supabase.from('nebudda_messages').insert({
      channel_id: activeChannel.id,
      user_id: myId, username,
      content: text, is_ai: false
    })

    // AI trigger: starts with @ai or @godlocal
    const aiMatch = text.match(/^@ai\s+(.*)/si) || text.match(/^@godlocal\s+(.*)/si)
    if (aiMatch) {
      setAiThinking(true)
      try {
        const res = await fetch('/api/nebudda/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: aiMatch[1], channel: activeChannel.name })
        })
        const data = await res.json()
        if (data.reply) {
          await supabase.from('nebudda_messages').insert({
            channel_id: activeChannel.id,
            user_id: 'godlocal_ai', username: 'GodLocal AI',
            content: data.reply, is_ai: true
          })
        }
      } catch { /* silent */ }
      setAiThinking(false)
    }
  }, [input, activeChannel, myId, username])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0A0C0F', fontFamily: "'-apple-system','Inter',sans-serif" }}>

      {/* ── Sidebar ── */}
      <div className={`flex flex-col shrink-0 border-r transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}
        style={{ borderColor: '#0d131e', background: '#080A0D' }}>

        {/* Sidebar header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: '#0d131e' }}>
          <Link href="/" className="text-gray-600 hover:text-gray-300 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <div className="text-xs font-extrabold tracking-wider" style={{ color: '#FD79A8' }}>NEBUDDA</div>
            <div className="text-[10px] text-gray-600 font-mono">GodLocal Social</div>
          </div>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse shrink-0" />
        </div>

        {/* Identity */}
        <div className="px-3 py-2.5 border-b" style={{ borderColor: '#0d131e' }}>
          {editingName ? (
            <div className="flex gap-1.5">
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key==='Enter' && saveName()}
                autoFocus placeholder="Твоё имя..."
                className="flex-1 text-xs px-2 py-1 rounded-lg outline-none text-white"
                style={{ background: '#0d131e', border: '1px solid #1a2535' }} />
              <button onClick={saveName} className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: '#FD79A833', color: '#FD79A8', border: '1px solid #FD79A840' }}>✓</button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(username); setEditingName(true) }}
              className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: userColor(myId)+'22', color: userColor(myId), border: `1px solid ${userColor(myId)}40` }}>
                {username.slice(0,2).toUpperCase()}
              </div>
              <span className="text-xs text-gray-400 truncate">{username}</span>
              <svg className="w-3 h-3 text-gray-600 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-700">Каналы</div>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch); if (window.innerWidth < 640) setSidebarOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all group"
              style={{ background: activeChannel?.id === ch.id ? 'rgba(253,121,168,0.08)' : 'transparent' }}>
              <span className="text-base shrink-0">{ch.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: activeChannel?.id === ch.id ? '#FD79A8' : '#9ca3af' }}>
                  # {ch.name}
                </div>
                <div className="text-[10px] text-gray-700 truncate">{ch.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* AI hint */}
        <div className="px-3 py-2.5 border-t" style={{ borderColor: '#0d131e' }}>
          <div className="text-[10px] text-gray-700 leading-relaxed">
            Напиши <span style={{ color: '#FD79A8' }}>@ai</span> + вопрос<br/>чтобы позвать GodLocal AI
          </div>
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 shrink-0 border-b"
          style={{ paddingTop: 'max(env(safe-area-inset-top),12px)', paddingBottom: '12px', borderColor: '#0d131e', background: 'rgba(8,10,13,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-600 hover:text-gray-300 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          {activeChannel && (
            <>
              <span className="text-xl shrink-0">{activeChannel.icon}</span>
              <div>
                <div className="text-sm font-bold text-white"># {activeChannel.name}</div>
                <div className="text-[11px] text-gray-600">{activeChannel.description}</div>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-gray-700">GodLocal AI</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FD79A8] animate-pulse" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 select-none">
              <div className="text-4xl mb-3">{activeChannel?.icon || '🌸'}</div>
              <div className="text-sm text-gray-500">Начни разговор</div>
              <div className="text-xs text-gray-700 mt-1">@ai — позвать GodLocal AI</div>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev = messages[i-1]
            const showMeta = !prev || prev.user_id !== msg.user_id || (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 120000
            const isMe = msg.user_id === myId
            const color = msg.is_ai ? '#FD79A8' : userColor(msg.user_id)

            return (
              <div key={msg.id} className={`flex gap-2.5 ${showMeta ? 'mt-4' : 'mt-0.5'}`}>
                {/* Avatar */}
                <div className="shrink-0 w-8 h-8" style={{ marginTop: showMeta ? 0 : -32 }}>
                  {showMeta && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: color+'22', color, border: `1px solid ${color}40` }}>
                      {msg.is_ai ? '⚡' : msg.username.slice(0,2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className="flex-1 min-w-0">
                  {showMeta && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color }}>
                        {msg.is_ai ? 'GodLocal AI' : isMe ? `${msg.username} (ты)` : msg.username}
                      </span>
                      <span className="text-[10px] text-gray-700">{timeStr(msg.created_at)}</span>
                    </div>
                  )}
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.is_ai ? 'font-[450]' : ''}`}
                    style={{ color: msg.is_ai ? '#e5e7eb' : isMe ? '#d1fae5' : '#d1d5db',
                      padding: '4px 10px',
                      background: msg.is_ai ? 'rgba(253,121,168,0.06)' : isMe ? 'rgba(0,255,157,0.04)' : 'transparent',
                      borderRadius: 8,
                      borderLeft: msg.is_ai ? '2px solid rgba(253,121,168,0.3)' : isMe ? '2px solid rgba(0,255,157,0.2)' : 'none',
                      display: 'inline-block', maxWidth: '100%' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}

          {/* AI thinking indicator */}
          {aiThinking && (
            <div className="flex gap-2.5 mt-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: '#FD79A822', color: '#FD79A8', border: '1px solid #FD79A840' }}>⚡</div>
              <div className="flex-1">
                <div className="text-xs font-semibold mb-0.5" style={{ color: '#FD79A8' }}>GodLocal AI</div>
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg" style={{ background: 'rgba(253,121,168,0.06)', border: '1px solid rgba(253,121,168,0.1)', display: 'inline-flex' }}>
                  {[0,1,2].map(n => (
                    <div key={n} className="w-1.5 h-1.5 rounded-full bg-[#FD79A8]"
                      style={{ animation: `pulse 1.2s ease-in-out ${n*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 shrink-0" style={{ paddingBottom: 'max(env(safe-area-inset-bottom),16px)', paddingTop: '12px', borderTop: '1px solid #0d131e', background: '#080A0D' }}>
          <div className="flex items-end gap-2 rounded-2xl px-3 py-2" style={{ background: '#0d131e', border: '1px solid #1a2535' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={`Сообщение в #${activeChannel?.name || '...'} · @ai чтобы позвать AI`}
              rows={1}
              disabled={!activeChannel}
              className="flex-1 bg-transparent outline-none resize-none text-sm text-gray-200 placeholder-gray-700 py-1"
              style={{ maxHeight: 120, minHeight: 24 }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || !activeChannel}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{ background: input.trim() ? '#FD79A8' : '#1a2535' }}>
              <svg className="w-4 h-4" style={{ color: input.trim() ? '#000' : '#4b5563' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
