'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: { tool: string; result: string }[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
      const res = await fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.content, history }),
      });
      const data = await res.json();
      if (data.model) setModel(data.model.split('-').slice(0, 3).join('-'));
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || data.error || 'No response',
          steps: data.steps,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ Backend unavailable. Check Render service.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0C0F', color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <a href="/" className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>← GodLocal</a>
        <div className="flex-1" />
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00FF9D' }} />
        <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
          GodLocal AI {model && <span style={{ color: 'rgba(255,255,255,0.25)' }}>· {model}</span>}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        {messages.length === 0 && (
          <div className="text-center mt-24">
            <div className="text-4xl mb-4">⚡</div>
            <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Ask GodLocal anything</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.1)' }}>ReAct agent · live market data · autonomous tools</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex mb-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: m.role === 'user' ? '#6C5CE7' : 'rgba(255,255,255,0.05)',
                  border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  color: m.role === 'user' ? '#fff' : 'rgba(255,255,255,0.88)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
                {m.steps && m.steps.length > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {m.steps.map((s, si) => (
                      <div key={si} className="text-xs font-mono mt-1" style={{ color: '#00FF9D', opacity: 0.6 }}>
                        ⚙ {s.tool}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start mb-4"
          >
            <div
              className="px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="inline-flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="rounded-full animate-bounce"
                    style={{ width: 6, height: 6, background: '#00FF9D', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message GodLocal AI..."
            className="flex-1 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '12px 16px',
              color: '#fff',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(0,255,157,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              background: '#00FF9D',
              color: '#000',
              border: 'none',
              borderRadius: 14,
              padding: '12px 20px',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.35 : 1,
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
