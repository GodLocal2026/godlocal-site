"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ─── Supabase REST helpers (no npm client) ─────────────────── */
const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function sbGet<T>(table: string, qs: string): Promise<T[]> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`sbGet ${table}: ${res.status}`);
  return res.json();
}

async function sbInsert(table: string, body: object): Promise<void> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`sbInsert ${table}: ${res.status}`);
}

/* ─── Types ─────────────────────────────────────────────────── */
interface Channel { id: string; name: string; icon: string; description: string }
interface Message { id: string; channel_id: string; user_id: string; username: string; content: string; is_ai: boolean; created_at: string }

/* ─── Helpers ────────────────────────────────────────────────── */
const COLORS = ["#00FF9D","#00B4D8","#6C5CE7","#FD79A8","#FDCB6E","#E17055","#55EFC4","#74B9FF"];
function userColor(uid: string) { let h = 0; for (let i=0;i<uid.length;i++) h=(h*31+uid.charCodeAt(i))&0xFFFF; return COLORS[h%COLORS.length]; }
function uid() { return "u_" + Math.random().toString(36).slice(2,10); }
function timeStr(iso: string) { return new Date(iso).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); }

export default function NebuddaPage() {
  const [channels,     setChannels]    = useState<Channel[]>([]);
  const [active,       setActive]      = useState<Channel|null>(null);
  const [messages,     setMessages]    = useState<Message[]>([]);
  const [input,        setInput]       = useState("");
  const [aiThinking,   setAiThinking]  = useState(false);
  const [sidebar,      setSidebar]     = useState(true);
  const [username,     setUsername]    = useState("");
  const [myId,         setMyId]        = useState("");
  const [editingName,  setEditingName] = useState(false);
  const [nameInput,    setNameInput]   = useState("");
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const lastTsRef   = useRef<string>("1970-01-01T00:00:00Z");

  /* identity */
  useEffect(() => {
    let id   = localStorage.getItem("nebudda_uid")  || uid();
    let name = localStorage.getItem("nebudda_name") || "Anonim_" + id.slice(-4);
    localStorage.setItem("nebudda_uid",  id);
    localStorage.setItem("nebudda_name", name);
    setMyId(id); setUsername(name);
  }, []);

  /* load channels */
  useEffect(() => {
    sbGet<Channel>("nebudda_channels", "order=created_at")
      .then(data => { setChannels(data); if (data.length) setActive(data[0]); })
      .catch(console.error);
  }, []);

  /* poll messages when channel changes */
  useEffect(() => {
    if (!active) return;
    if (pollRef.current) clearInterval(pollRef.current);
    lastTsRef.current = "1970-01-01T00:00:00Z";
    setMessages([]);

    const fetch100 = () =>
      sbGet<Message>(
        "nebudda_messages",
        `channel_id=eq.${active.id}&order=created_at.asc&limit=100`
      ).then(data => {
        setMessages(data);
        if (data.length) lastTsRef.current = data[data.length-1].created_at;
      }).catch(console.error);

    fetch100();

    /* poll every 2.5s for new rows */
    pollRef.current = setInterval(() => {
      sbGet<Message>(
        "nebudda_messages",
        `channel_id=eq.${active.id}&created_at=gt.${encodeURIComponent(lastTsRef.current)}&order=created_at.asc&limit=50`
      ).then(rows => {
        if (!rows.length) return;
        lastTsRef.current = rows[rows.length-1].created_at;
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const fresh = rows.filter(r => !ids.has(r.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }).catch(console.error);
    }, 2500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active]);

  /* scroll to bottom */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, aiThinking]);

  const saveName = () => {
    const n = nameInput.trim() || username;
    localStorage.setItem("nebudda_name", n); setUsername(n); setEditingName(false);
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !active || !myId) return;
    setInput("");

    await sbInsert("nebudda_messages", {
      channel_id: active.id, user_id: myId, username, content: text, is_ai: false,
    });

    /* @ai trigger */
    const m = text.match(/^@(?:ai|godlocal)\s+([\s\S]+)/i);
    if (m) {
      setAiThinking(true);
      try {
        const res = await fetch("/api/nebudda/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: m[1], channel: active.name }),
        });
        const data = await res.json();
        if (data.reply) {
          await sbInsert("nebudda_messages", {
            channel_id: active.id, user_id: "godlocal_ai",
            username: "GodLocal AI", content: data.reply, is_ai: true,
          });
        }
      } catch { /* silent */ }
      setAiThinking(false);
    }
  }, [input, active, myId, username]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden"
      style={{ background: "#0A0C0F", fontFamily: "-apple-system,Inter,sans-serif", zIndex: 50 }}>

      {/* ── Sidebar ── */}
      <div className={`flex flex-col shrink-0 border-r transition-all duration-300 ${sidebar ? "w-64" : "w-0 overflow-hidden"}`}
        style={{ borderColor: "#0d131e", background: "#080A0D" }}>

        {/* header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: "#0d131e" }}>
          <Link href="/" className="text-gray-600 hover:text-gray-300 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <div className="text-xs font-extrabold tracking-wider" style={{ color: "#FD79A8" }}>NEBUDDA</div>
            <div className="text-[10px] text-gray-600 font-mono">GodLocal Social</div>
          </div>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse shrink-0" />
        </div>

        {/* identity */}
        <div className="px-3 py-2.5 border-b" style={{ borderColor: "#0d131e" }}>
          {editingName ? (
            <div className="flex gap-1.5">
              <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveName()} autoFocus placeholder="Твоё имя..."
                className="flex-1 text-xs px-2 py-1 rounded-lg outline-none text-white"
                style={{ background: "#0d131e", border: "1px solid #1a2535" }} />
              <button onClick={saveName} className="text-xs px-2 py-1 rounded-lg font-semibold"
                style={{ background: "#FD79A833", color: "#FD79A8", border: "1px solid #FD79A840" }}>✓</button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(username); setEditingName(true); }}
              className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: userColor(myId)+"22", color: userColor(myId), border: `1px solid ${userColor(myId)}40` }}>
                {username.slice(0,2).toUpperCase()}
              </div>
              <span className="text-xs text-gray-400 truncate">{username}</span>
              <svg className="w-3 h-3 text-gray-600 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
            </button>
          )}
        </div>

        {/* channels */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-gray-700">Каналы</div>
          {channels.map(ch => (
            <button key={ch.id}
              onClick={() => { setActive(ch); if (window.innerWidth < 640) setSidebar(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
              style={{ background: active?.id === ch.id ? "rgba(253,121,168,0.08)" : "transparent" }}>
              <span className="text-base shrink-0">{ch.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate"
                  style={{ color: active?.id === ch.id ? "#FD79A8" : "#9ca3af" }}>
                  # {ch.name}
                </div>
                <div className="text-[10px] text-gray-700 truncate">{ch.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* ai hint */}
        <div className="px-3 py-2.5 border-t" style={{ borderColor: "#0d131e" }}>
          <div className="text-[10px] text-gray-700 leading-relaxed">
            Напиши <span style={{ color: "#FD79A8" }}>@ai</span> + вопрос, чтобы позвать GodLocal AI
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* chat header */}
        <div className="flex items-center gap-3 px-4 shrink-0 border-b"
          style={{ paddingTop: "max(env(safe-area-inset-top),12px)", paddingBottom: "12px",
            borderColor: "#0d131e", background: "rgba(8,10,13,0.9)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => setSidebar(o => !o)} className="text-gray-600 hover:text-gray-300 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          {active && (
            <>
              <span className="text-xl shrink-0">{active.icon}</span>
              <div>
                <div className="text-sm font-bold text-white"># {active.name}</div>
                <div className="text-[11px] text-gray-600">{active.description}</div>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono text-gray-700">GodLocal AI</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FD79A8] animate-pulse" />
          </div>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
          {messages.length === 0 && !aiThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30 select-none">
              <div className="text-4xl mb-3">{active?.icon ?? "🌸"}</div>
              <div className="text-sm text-gray-500">Начни разговор</div>
              <div className="text-xs text-gray-700 mt-1">@ai — позвать GodLocal AI</div>
            </div>
          )}

          {messages.map((msg, i) => {
            const prev     = messages[i-1];
            const showMeta = !prev || prev.user_id !== msg.user_id
              || (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 120000;
            const isMe  = msg.user_id === myId;
            const color = msg.is_ai ? "#FD79A8" : userColor(msg.user_id);

            return (
              <div key={msg.id} className={`flex gap-2.5 ${showMeta ? "mt-4" : "mt-0.5"}`}>
                <div className="shrink-0 w-8 h-8" style={{ marginTop: showMeta ? 0 : -32 }}>
                  {showMeta && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: color+"22", color, border: `1px solid ${color}40` }}>
                      {msg.is_ai ? "⚡" : msg.username.slice(0,2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {showMeta && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color }}>
                        {msg.is_ai ? "GodLocal AI" : isMe ? `${msg.username} (ты)` : msg.username}
                      </span>
                      <span className="text-[10px] text-gray-700">{timeStr(msg.created_at)}</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      color: msg.is_ai ? "#e5e7eb" : isMe ? "#d1fae5" : "#d1d5db",
                      padding: "4px 10px",
                      background: msg.is_ai ? "rgba(253,121,168,0.06)" : isMe ? "rgba(0,255,157,0.04)" : "transparent",
                      borderRadius: 8,
                      borderLeft: msg.is_ai ? "2px solid rgba(253,121,168,0.3)" : isMe ? "2px solid rgba(0,255,157,0.2)" : "none",
                      display: "inline-block", maxWidth: "100%",
                    }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })}

          {aiThinking && (
            <div className="flex gap-2.5 mt-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: "#FD79A822", color: "#FD79A8", border: "1px solid #FD79A840" }}>⚡</div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: "#FD79A8" }}>GodLocal AI</div>
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(253,121,168,0.06)", border: "1px solid rgba(253,121,168,0.1)", display: "inline-flex" }}>
                  {[0,1,2].map(n => (
                    <span key={n} className="w-1.5 h-1.5 rounded-full bg-[#FD79A8]"
                      style={{ animation: `pulse 1.2s ease-in-out ${n*0.2}s infinite`, display: "inline-block" }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div className="px-4 shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom),16px)", paddingTop: "12px",
            borderTop: "1px solid #0d131e", background: "#080A0D" }}>
          <div className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{ background: "#0d131e", border: "1px solid #1a2535" }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={onKey} rows={1}
              placeholder={`Сообщение в #${active?.name ?? "…"} · @ai чтобы позвать AI`}
              disabled={!active}
              className="flex-1 bg-transparent outline-none resize-none text-sm text-gray-200 placeholder-gray-700 py-1"
              style={{ maxHeight: 120, minHeight: 24 }} />
            <button onClick={sendMessage} disabled={!input.trim() || !active}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{ background: input.trim() ? "#FD79A8" : "#1a2535" }}>
              <svg className="w-4 h-4" style={{ color: input.trim() ? "#000" : "#4b5563" }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
