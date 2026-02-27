'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadMessages, saveMessage, clearMessages, loadSoul, saveSoul, getSetting, setSetting, type StoredMessage } from '@/lib/soul-db';
import { browserAgent } from '@/lib/browser-agent';

interface ToolStep { tool: string; result: string; }
interface Message { role: 'user' | 'assistant'; content: string; steps?: ToolStep[]; model?: string; mode?: 'server' | 'sovereign'; }
interface MarketData { bitcoin?: { usd: number; usd_24h_change: number }; ethereum?: { usd: number; usd_24h_change: number }; solana?: { usd: number; usd_24h_change: number }; }
interface AgentStatus { status: string; model?: string; tools?: string[]; }

const QUICK_PROMPTS = [
  { label: '📈 Crypto', cmd: 'What are the current prices of Bitcoin, Ethereum and Solana?' },
  { label: '🧠 Agent', cmd: 'Tell me about your capabilities and available tools' },
  { label: '🌐 Search', cmd: 'Find the latest news about AI agents in 2026' },
  { label: '⚡ Status', cmd: 'Check the status of all GodLocal systems' },
];

const TOOL_ICONS: Record<string, string> = {
  search_web: '🌐', fetch_url: '🔗', get_market_data: '📊', post_tweet: '🐦',
  send_telegram: '✈️', create_github_issue: '🐙', get_datetime: '🕐',
  calculate: '🧮', remember: '💾', recall: '🧠', forget: '🗑️',
};

function MarketTicker({ data }: { data: MarketData }) {
  const coins = [{ label: 'BTC', d: data.bitcoin }, { label: 'ETH', d: data.ethereum }, { label: 'SOL', d: data.solana }];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {coins.map(({ label, d }) => d ? (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '4px 10px' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>${d.usd.toLocaleString()}</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: d.usd_24h_change >= 0 ? '#00FF9D' : '#FF6B6B' }}>{d.usd_24h_change >= 0 ? '▲' : '▼'}{Math.abs(d.usd_24h_change).toFixed(2)}%</span>
        </div>
      ) : null)}
    </div>
  );
}

function ToolBadge({ tool, result }: ToolStep) {
  const [open, setOpen] = useState(false);
  const icon = TOOL_ICONS[tool] || '⚙️';
  return (
    <div style={{ marginTop: 4 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'rgba(0,255,157,0.07)', border: '1px solid rgba(0,255,157,0.18)', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, outline: 'none' }}>
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

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [groqKey, setGroqKey] = useState('');
  const [soul, setSoulVal] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSetting('groqKey').then(k => { if (k) setGroqKey(k); });
    loadSoul().then(s => setSoulVal(s));
  }, []);

  const save = async () => {
    await setSetting('groqKey', groqKey);
    await saveSoul(soul);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: '#0E1014', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#00FF9D' }}>⚙ Sovereign Settings</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>GROQ API KEY (for Sovereign Mode)</label>
          <input type="password" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_..." style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'monospace', outline: 'none' }} />
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 5, fontFamily: 'monospace' }}>Stored in browser IndexedDB · never leaves your device</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>SOUL MEMORY (injected into every session)</label>
          <textarea value={soul} onChange={e => setSoulVal(e.target.value)} placeholder="# Who I am&#10;- Working on GodLocal...&#10;- Prefer direct answers..." rows={6} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical' }} />
        </div>

        <button onClick={save} style={{ width: '100%', padding: '12px', background: saved ? 'rgba(0,255,157,0.15)' : '#00FF9D', color: saved ? '#00FF9D' : '#000', border: saved ? '1px solid rgba(0,255,157,0.3)' : 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'monospace' }}>
          {saved ? '✓ Saved to IndexedDB' : 'Save'}
        </button>
      </motion.div>
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
  const [showSettings, setShowSettings] = useState(false);
  const [sovereignMode, setSovereignMode] = useState(false);
  const [backendAlive, setBackendAlive] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load persisted messages from IndexedDB on mount ──────────────────────
  useEffect(() => {
    loadMessages().then(stored => {
      if (stored.length > 0) {
        setMessages(stored.map(m => ({
          role: m.role,
          content: m.content,
          steps: m.steps,
          model: m.model,
          mode: m.mode,
        })));
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Backend health check ─────────────────────────────────────────────────
  const checkBackend = useCallback(async () => {
    try {
      const r = await fetch('https://godlocal-api.onrender.com/health', { signal: AbortSignal.timeout(5000) });
      const alive = r.ok;
      setBackendAlive(alive);
      // Auto-enable sovereign mode if backend is down and user has Groq key
      if (!alive) {
        const key = await getSetting('groqKey');
        if (key) setSovereignMode(true);
      }
    } catch {
      setBackendAlive(false);
      const key = await getSetting('groqKey');
      if (key) setSovereignMode(true);
    }
  }, []);

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
    checkBackend();
    fetchMarket();
    fetchStatus();
    const t1 = setInterval(fetchMarket, 5 * 60 * 1000);
    const t2 = setInterval(fetchStatus, 30 * 1000);
    const t3 = setInterval(checkBackend, 60 * 1000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [fetchMarket, fetchStatus, checkBackend]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Persist user message to IndexedDB
    await saveMessage({ role: 'user', content: msg, ts: Date.now() });

    try {
      let assistantMsg: Message;
      const mode = sovereignMode ? 'sovereign' : 'server';

      if (sovereignMode) {
        // ── Sovereign Mode: direct Groq API from browser ─────────────
        const groqKey = await getSetting('groqKey');
        if (!groqKey) throw new Error('No Groq API key. Open ⚙ Settings → add key.');
        const soul = await loadSoul();
        const history = newMessages.map(m => ({ role: m.role, content: m.content }));
        const result = await browserAgent(history, soul, groqKey);
        assistantMsg = { role: 'assistant', content: result.response, model: result.model, mode: 'sovereign' };
      } else {
        // ── Server Mode: Next.js proxy → Render backend ──────────────
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        const res = await fetch('/api/think', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: msg, history }),
          signal: AbortSignal.timeout(90_000),
        });
        const data = await res.json();
        assistantMsg = { role: 'assistant', content: data.response || data.error || 'No response', steps: data.steps, model: data.model, mode: 'server' };
      }

      setMessages(prev => [...prev, assistantMsg]);

      // Persist assistant message to IndexedDB
      await saveMessage({
        role: 'assistant',
        content: assistantMsg.content,
        steps: assistantMsg.steps,
        model: assistantMsg.model,
        ts: Date.now(),
        mode,
      });

    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unavailable';
      const errAssistant: Message = { role: 'assistant', content: `⚠️ ${errMsg}` };
      setMessages(prev => [...prev, errAssistant]);
      await saveMessage({ role: 'assistant', content: `⚠️ ${errMsg}`, ts: Date.now() });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages, sovereignMode]);

  const clearChat = async () => {
    setMessages([]);
    setInput('');
    await clearMessages();
  };

  const modeBadgeColor = sovereignMode ? '#6C5CE7' : (backendAlive ? '#00FF9D' : '#FF6B6B');
  const modeLabel = sovereignMode ? '⚡ Sovereign' : (backendAlive ? '● Server' : '⚠ Offline');

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#0A0C0F', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Settings Modal */}
      <AnimatePresence>{showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}</AnimatePresence>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'rgba(10,12,15,0.96)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>← GodLocal</a>
        <div style={{ flex: 1 }} />

        {/* Mode badge — clickable to toggle */}
        <button
          onClick={() => setSovereignMode(s => !s)}
          title={sovereignMode ? 'Switch to Server mode' : 'Switch to Sovereign mode'}
          style={{ background: 'none', border: `1px solid ${modeBadgeColor}22`, borderRadius: 8, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, outline: 'none' }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: modeBadgeColor, boxShadow: `0 0 5px ${modeBadgeColor}99` }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: modeBadgeColor }}>{modeLabel}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
            {agentStatus?.model ? agentStatus.model.split('-').slice(0, 3).join('-') : 'GodLocal AI'}
          </span>
        </div>

        <button onClick={() => setShowStatus(s => !s)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.45)', outline: 'none' }}>
          {showStatus ? 'Hide' : 'Status'}
        </button>
        <button onClick={() => setShowSettings(true)} style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(108,92,231,0.8)', outline: 'none' }}>⚙</button>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{ background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.18)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(255,107,107,0.65)', outline: 'none' }}>Clear</button>
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

      {/* Sovereign Mode banner (when active) */}
      {sovereignMode && (
        <div style={{ padding: '6px 16px', background: 'rgba(108,92,231,0.07)', borderBottom: '1px solid rgba(108,92,231,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(108,92,231,0.85)' }}>⚡ Sovereign Mode — running in your browser · data stays local · IndexedDB</span>
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
                <button key={q.label} onClick={() => send(q.cmd)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.55)', outline: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,157,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,255,157,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >{q.label}</button>
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
                  fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{m.content}</div>
                {m.steps && m.steps.length > 0 && (
                  <div style={{ marginTop: 5, paddingLeft: 2 }}>
                    {m.steps.map((s, si) => <ToolBadge key={si} {...s} />)}
                  </div>
                )}
                {m.role === 'assistant' && (m.model || m.mode) && (
                  <div style={{ marginTop: 3, paddingLeft: 4, fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.18)', display: 'flex', gap: 8 }}>
                    {m.model && <span>via {m.model.split('-').slice(0, 3).join('-')}</span>}
                    {m.mode === 'sovereign' && <span style={{ color: 'rgba(108,92,231,0.5)' }}>⚡ sovereign</span>}
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
                  <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: sovereignMode ? '#6C5CE7' : '#00FF9D', display: 'inline-block', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.15}s` }} />
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
            placeholder={sovereignMode ? 'Message GodLocal (Sovereign Mode)…' : 'Message GodLocal AI…'}
            autoFocus
            disabled={loading}
            style={{ flex: 1, fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.05)', border: `1px solid ${sovereignMode ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 14, padding: '12px 16px', color: '#fff', transition: 'border-color 0.2s' }}
            onFocus={e => { e.target.style.borderColor = sovereignMode ? 'rgba(108,92,231,0.6)' : 'rgba(0,255,157,0.4)'; }}
            onBlur={e => { e.target.style.borderColor = sovereignMode ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.1)'; }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? (sovereignMode ? 'rgba(108,92,231,0.12)' : 'rgba(0,255,157,0.12)') : (sovereignMode ? '#6C5CE7' : '#00FF9D'), color: loading || !input.trim() ? (sovereignMode ? 'rgba(108,92,231,0.35)' : 'rgba(0,255,157,0.35)') : '#fff', border: 'none', borderRadius: 14, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', outline: 'none' }}
          >
            {loading ? '···' : 'Send'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.1)', marginTop: 6, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
          {sovereignMode ? '⚡ Sovereign · llama-3.1-8b · browser · IndexedDB · zero-backend' : 'ReAct · llama-3.3-70b · search_web · market data · autonomous'}
        </p>
      </div>
    </div>
  );
}
