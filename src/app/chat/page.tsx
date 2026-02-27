'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolStep {
  tool: string;
  result: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: ToolStep[];
  model?: string;
}

interface MarketData {
  bitcoin?: { usd: number; usd_24h_change: number };
  ethereum?: { usd: number; usd_24h_change: number };
  solana?: { usd: number; usd_24h_change: number };
}

interface AgentStatus {
  status: string;
  model?: string;
  tools?: string[];
}

const QUICK_PROMPTS = [
  { label: '📈 Crypto', cmd: 'What are the current prices of Bitcoin, Ethereum and Solana?' },
  { label: '🧠 Agent', cmd: 'Tell me about your capabilities and available tools' },
  { label: '🌐 Search', cmd: 'Find the latest news about AI agents in 2026' },
  { label: '⚡ Status', cmd: 'Check the status of all GodLocal systems' },
];

const TOOL_ICONS: Record<string, string> = {
  search_web: '🌐',
  fetch_url: '🔗',
  get_market_data: '📊',
  post_tweet: '🐦',
  send_telegram: '✈️',
  create_github_issue: '🐙',
  get_datetime: '🕐',
  calculate: '🧮',
  remember: '💾',
  recall: '🧠',
  forget: '🗑️',
};

function MarketTicker({ data }: { data: MarketData }) {
  const coins = [
    { label: 'BTC', d: data.bitcoin },
    { label: 'ETH', d: data.ethereum },
    { label: 'SOL', d: data.solana },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {coins.map(({ label, d }) =>
        d ? (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '4px 10px' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>${d.usd.toLocaleString()}</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: d.usd_24h_change >= 0 ? '#00FF9D' : '#FF6B6B' }}>
              {d.usd_24h_change >= 0 ? '▲' : '▼'}{Math.abs(d.usd_24h_change).toFixed(2)}%
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

function ToolBadge({ tool, result }: ToolStep) {
  const [open, setOpen] = useState(false);
  const icon = TOOL_ICONS[tool] || '⚙️';
  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'rgba(0,255,157,0.07)', border: '1px solid rgba(0,255,157,0.18)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, outline: 'none' }}
      >
        <span style={{ fontSize: 11 }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#00FF9D', fontFamily: 'monospace' }}>{tool}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && result && (
        <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(0,0,0,0.35)', borderRadius: 8, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)', maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {result.length > 400 ? result.slice(0, 400) + '…' : result}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchMarket = useCallback(async () => {
    try {
      const r = await fetch('https://godlocal-api.onrender.com/market');
      const d = await r.json();
      if (d.prices) setMarket(d.prices);
    } catch {}
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('https://godlocal-api.onrender.com/status');
      const d = await r.json();
      setAgentStatus(d);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMarket();
    fetchStatus();
    const t1 = setInterval(fetchMarket, 5 * 60 * 1000);
    const t2 = setInterval(fetchStatus, 30 * 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchMarket, fetchStatus]);

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: msg, history }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || data.error || 'No response',
          steps: data.steps,
          model: data.model,
        },
      ]);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Backend unavailable';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages]);

  const clearChat = () => { setMessages([]); setInput(''); };

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#0A0C0F', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'rgba(10,12,15,0.96)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>← GodLocal</a>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: agentStatus?.status === 'ok' ? '#00FF9D' : '#888', boxShadow: agentStatus?.status === 'ok' ? '0 0 6px rgba(0,255,157,0.6)' : undefined }} />
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
            {agentStatus?.model ? agentStatus.model.split('-').slice(0, 3).join('-') : 'GodLocal AI'}
          </span>
        </div>
        <button onClick={() => setShowStatus(s => !s)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.45)', outline: 'none' }}>
          {showStatus ? 'Hide' : 'Status'}
        </button>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{ background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.18)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(255,107,107,0.65)', outline: 'none' }}>
            Clear
          </button>
        )}
      </div>

      {/* Status panel */}
      <AnimatePresence>
        {showStatus && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '10px 16px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>🧠 <span style={{ color: '#6C5CE7' }}>ReAct</span> · 8 steps · Groq fallback chain</span>
              {agentStatus?.tools && agentStatus.tools.map((t: string) => (
                <span key={t} style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(0,255,157,0.65)', background: 'rgba(0,255,157,0.06)', padding: '2px 7px', borderRadius: 6, border: '1px solid rgba(0,255,157,0.12)' }}>
                  {TOOL_ICONS[t] || '⚙'} {t}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market bar */}
      {market && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
          <MarketTicker data={market} />
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', maxWidth: 720, margin: '0 auto', width: '100%' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
            <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.18)', marginBottom: 4 }}>GodLocal AI</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.1)', marginBottom: 24 }}>ReAct · live market · web search · autonomous tools</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q.label}
                  onClick={() => send(q.cmd)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.55)', outline: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,157,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,255,157,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex', marginBottom: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? '#6C5CE7' : 'rgba(255,255,255,0.05)',
                  border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  color: m.role === 'user' ? '#fff' : 'rgba(255,255,255,0.88)',
                  fontSize: 14,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content}
                </div>
                {m.steps && m.steps.length > 0 && (
                  <div style={{ marginTop: 5, paddingLeft: 2 }}>
                    {m.steps.map((s, si) => <ToolBadge key={si} {...s} />)}
                  </div>
                )}
                {m.role === 'assistant' && m.model && (
                  <div style={{ marginTop: 3, paddingLeft: 4, fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.18)' }}>
                    via {m.model.split('-').slice(0, 3).join('-')}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF9D', display: 'inline-block', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,12,15,0.96)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message GodLocal AI..."
            autoFocus
            disabled={loading}
            style={{ flex: 1, fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', color: '#fff', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,255,157,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? 'rgba(0,255,157,0.12)' : '#00FF9D', color: loading || !input.trim() ? 'rgba(0,255,157,0.35)' : '#000', border: 'none', borderRadius: 14, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', outline: 'none' }}
          >
            {loading ? '···' : 'Send'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.1)', marginTop: 6, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
          ReAct · llama-3.3-70b · search_web · market data · autonomous
        </p>
      </div>
    </div>
  );
}
