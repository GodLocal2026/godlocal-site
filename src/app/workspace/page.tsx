'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  isImage: boolean
  aiAnalysis?: string
  analyzing?: boolean
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: UploadedFile[]
  ts: number
}

export default function WorkspacePage() {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    arr.forEach(file => {
      const id = Math.random().toString(36).slice(2)
      const url = URL.createObjectURL(file)
      const isImage = file.type.startsWith('image/')
      const uploaded: UploadedFile = {
        id, name: file.name, type: file.type,
        size: file.size, url, isImage, analyzing: false
      }
      setFiles(prev => [...prev, uploaded])
    })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  const sendToAgent = async () => {
    if (!text.trim() && files.length === 0) return
    setLoading(true)

    const fileDescriptions = files.map(f =>
      `[File: ${f.name} (${f.type}, ${formatSize(f.size)})]`
    ).join('\n')

    const prompt = [text.trim(), fileDescriptions].filter(Boolean).join('\n\n')

    const userMsg: Message = { role: 'user', content: text.trim(), files: [...files], ts: Date.now() }
    setMessages(prev => [...prev, userMsg])

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(`${API_BASE}/think`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history })
      })
      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || 'No response',
        ts: Date.now()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant', content: 'Error connecting to agent', ts: Date.now()
      }])
    }

    setText('')
    setFiles([])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendToAgent()
  }

  return (
    <div className="min-h-screen bg-[#0A0C0F] text-gray-200" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, \'SF Pro Display\', sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#1a1f2e] px-6 py-4 flex items-center gap-3 bg-[#0a0c0f]/95 sticky top-0 z-10 backdrop-blur">
        <a href="/" className="text-[#1a2030] hover:text-gray-500 transition-colors text-sm">← Home</a>
        <span className="text-[#1a2030]">/</span>
        <h1 className="text-[#00FF9D] font-semibold text-lg">Workspace</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00FF9D] animate-pulse" />
          <span className="text-xs text-gray-600">Agent connected</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Conversation history */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#6C5CE7] text-white rounded-br-md'
                    : 'bg-[#0f1520] border border-[#1a2030] text-gray-300 rounded-bl-md'
                }`}>
                  {msg.files && msg.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.files.map(f => (
                        <div key={f.id} className="text-xs bg-black/30 rounded-lg px-2 py-1 flex items-center gap-1">
                          {f.isImage ? '🖼' : '📄'} {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-xs mt-1 opacity-40">{new Date(msg.ts).toLocaleTimeString()}</div>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#0f1520] border border-[#1a2030] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-[#00FF9D]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Editor area */}
        <div
          className={`rounded-2xl border-2 transition-colors ${
            dragging ? 'border-[#00FF9D]/60 bg-[#00FF9D]/5' : 'border-[#1a2030] bg-[#0c0e14]'
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={dragging ? 'Drop files here...' : 'Write something, paste a prompt, or drop files here...\n\nCtrl+Enter to send to agent'}
            className="w-full bg-transparent px-5 pt-5 pb-3 text-gray-200 placeholder-gray-700 resize-none outline-none text-sm leading-relaxed"
            style={{ minHeight: '180px' }}
          />

          {/* File previews */}
          {files.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-3">
              <AnimatePresence>
                {files.map(f => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group"
                  >
                    {f.isImage ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#1a2030]">
                        <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                        <button
                          onClick={() => removeFile(f.id)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >×</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#111520] border border-[#1a2030] rounded-xl px-3 py-2">
                        <span className="text-lg">📄</span>
                        <div>
                          <div className="text-xs text-gray-300 max-w-[120px] truncate">{f.name}</div>
                          <div className="text-xs text-gray-600">{formatSize(f.size)}</div>
                        </div>
                        <button
                          onClick={() => removeFile(f.id)}
                          className="ml-1 text-gray-600 hover:text-red-400 transition-colors text-sm"
                        >×</button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Toolbar */}
          <div className="px-5 py-3 border-t border-[#1a2030] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#00FF9D] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#00FF9D]/5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Add files
              </button>
              <button
                onClick={() => { fileInputRef.current && (fileInputRef.current.accept = 'image/*'); fileInputRef.current?.click() }}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#6C5CE7] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#6C5CE7]/5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo
              </button>
              {files.length > 0 && (
                <span className="text-xs text-gray-600">{files.length} file{files.length > 1 ? 's' : ''} attached</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-700">⌘↵ to send</span>
              <button
                onClick={sendToAgent}
                disabled={loading || (!text.trim() && files.length === 0)}
                className="flex items-center gap-2 px-4 py-2 bg-[#00FF9D] text-[#0A0C0F] text-sm font-semibold rounded-xl hover:bg-[#00e890] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {loading ? 'Thinking...' : 'Send to Agent'}
              </button>
            </div>
          </div>
        </div>

        {/* Empty state hint */}
        {messages.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: '✍️', title: 'Write & Analyze', desc: 'Type anything — code, text, ideas — and send to the AI agent' },
              { icon: '🖼', title: 'Upload Images', desc: 'Drag & drop photos or click Photo button. Agent describes and analyzes them' },
              { icon: '📄', title: 'Add Files', desc: 'Attach documents, CSV, JSON — agent reads and extracts insights' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0c0e14] border border-[#1a2030] rounded-2xl p-4"
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium text-gray-300 mb-1">{item.title}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
