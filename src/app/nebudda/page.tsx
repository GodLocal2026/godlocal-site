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
interface Message { id: string; channel_id: string; user_id: string; username: string; content: string; is_ai: boolean; created_at: string; msg_type?: string; media_url?: string }

/* ─── Helpers ────────────────────────────────────────────────── */
const COLORS = ["#00FF9D","#00B4D8","#6C5CE7","#FD79A8","#FDCB6E","#E17055","#55EFC4","#74B9FF"];
const STICKER_PACKS: Record<string, string[]> = {
  "Буба": ["🧸","🌸","💕","✨","🎀","🍬","🌙","🦋","🍭","🎪"],
  "Вайб": ["🔥","💀","🗿","😭","💅","🤑","👑","🥶","🤡","👻"],
  "Реакции": ["👍","👎","❤️","😂","😮","😢","🎉","🤔","💯","⚡"],
};

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
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPack,  setStickerPack] = useState("Буба");
  const [isRecording,  setIsRecording] = useState(false);
  const [recordTime,   setRecordTime]  = useState(0);
  const [showImgPrev,  setShowImgPrev] = useState<string|null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval>|null>(null);
  const lastTsRef   = useRef<string>("1970-01-01T00:00:00Z");
  const mediaRecRef = useRef<MediaRecorder|null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

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


  /* ─── Voice Recording ──────────────────────────────────────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      audioChunks.current = [];
      mr.ondataavailable = e => audioChunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        if (!active) return;
        const dur = recordTime;
        await sbInsert("nebudda_messages", {
          channel_id: active.id, user_id: myId, username,
          content: `🎤 Голосовое (0:${String(dur).padStart(2,'0')})`,
          is_ai: false, msg_type: "voice",
        });
        setMessages(prev => [...prev, {
          id: 'local_v' + Date.now(), channel_id: active.id, user_id: myId,
          username, content: `🎤 Голосовое (0:${String(dur).padStart(2,'0')})`,
          is_ai: false, created_at: new Date().toISOString(), msg_type: "voice", media_url: url,
        }]);
      };
      mr.start();
      mediaRecRef.current = mr;
      setIsRecording(true);
      setRecordTime(0);
      recTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch { alert('Микрофон недоступен'); }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop(); mediaRecRef.current = null;
    setIsRecording(false);
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
  };

  /* ─── Image upload ─────────────────────────────────────────── */
  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    const reader = new FileReader();
    reader.onload = () => setShowImgPrev(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendImage = async () => {
    if (!showImgPrev || !active) return;
    await sbInsert("nebudda_messages", {
      channel_id: active.id, user_id: myId, username,
      content: "📷 Фото", is_ai: false, msg_type: "image",
    });
    setMessages(prev => [...prev, {
      id: 'local_i' + Date.now(), channel_id: active.id, user_id: myId,
      username, content: "📷 Фото", is_ai: false, created_at: new Date().toISOString(),
      msg_type: "image", media_url: showImgPrev,
    }]);
    setShowImgPrev(null);
  };

  /* ─── Send Sticker ─────────────────────────────────────────── */
  const sendSticker = async (emoji: string) => {
    if (!active || !myId) return;
    await sbInsert("nebudda_messages", {
      channel_id: active.id, user_id: myId, username,
      content: emoji, is_ai: false, msg_type: "sticker",
    });
    setShowStickers(false);
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
            <span style={{ color: "#FD79A8" }}>@ai</span> вопрос → GodLocal AI<br/>🎤 голос · 😀 стикеры · 📷 фото
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
                  {msg.msg_type === "sticker" ? (
                    <span className="text-5xl leading-none select-none">{msg.content}</span>
                  ) : msg.msg_type === "voice" ? (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(253,121,168,0.08)", border: "1px solid rgba(253,121,168,0.15)" }}>
                      <span>🎤</span>
                      {msg.media_url ? (
                        <audio controls src={msg.media_url} className="h-8" style={{ maxWidth: 200 }} />
                      ) : (
                        <span className="text-xs text-gray-400">{msg.content}</span>
                      )}
                    </div>
                  ) : msg.msg_type === "image" && msg.media_url ? (
                    <img src={msg.media_url} alt="photo" className="rounded-xl" style={{ maxWidth: 280, maxHeight: 300, objectFit: "cover" }} />
                  ) : (
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
                  )}
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

        {/* Image preview */}
        {showImgPrev && (
          <div className="px-4 py-2 border-t" style={{ borderColor: "#0d131e", background: "#080A0D" }}>
            <div className="flex items-center gap-3">
              <img src={showImgPrev} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 text-xs text-gray-500">Отправить фото?</div>
              <button onClick={sendImage} className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: "#FD79A8", color: "#000" }}>Отправить</button>
              <button onClick={() => setShowImgPrev(null)} className="text-xs px-2 py-1.5 text-gray-500">✕</button>
            </div>
          </div>
        )}

        {/* Stickers panel */}
        {showStickers && (
          <div className="px-4 py-3 border-t" style={{ borderColor: "#0d131e", background: "#080A0D" }}>
            <div className="flex gap-2 mb-2">
              {Object.keys(STICKER_PACKS).map(pack => (
                <button key={pack} onClick={() => setStickerPack(pack)}
                  className="text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all"
                  style={{
                    background: stickerPack === pack ? "#FD79A833" : "#0d131e",
                    color: stickerPack === pack ? "#FD79A8" : "#6b7280",
                    border: `1px solid ${stickerPack === pack ? "#FD79A840" : "#1a2535"}`,
                  }}>{pack}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {STICKER_PACKS[stickerPack as keyof typeof STICKER_PACKS].map(s => (
                <button key={s} onClick={() => sendSticker(s)}
                  className="text-3xl hover:scale-125 active:scale-90 transition-transform p-1">{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Recording bar */}
        {isRecording && (
          <div className="px-4 py-3 border-t flex items-center gap-3"
            style={{ borderColor: "#0d131e", background: "rgba(253,60,60,0.05)" }}>
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400 font-mono">0:{String(recordTime).padStart(2,'0')}</span>
            <div className="flex-1 text-xs text-gray-600">Запись голосового...</div>
            <button onClick={stopRecording}
              className="text-xs px-4 py-1.5 rounded-full font-semibold"
              style={{ background: "#FD79A8", color: "#000" }}>Отправить</button>
            <button onClick={() => { mediaRecRef.current?.stop(); setIsRecording(false); if (recTimerRef.current) clearInterval(recTimerRef.current); }}
              className="text-xs text-gray-500 px-2">Отмена</button>
          </div>
        )}

        {/* input */}
        {!isRecording && (
          <div className="px-4 shrink-0"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom),16px)", paddingTop: "12px",
              borderTop: "1px solid #0d131e", background: "#080A0D" }}>
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2"
              style={{ background: "#0d131e", border: "1px solid #1a2535" }}>
              <button onClick={() => fileRef.current?.click()}
                className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-400">📷</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImageSelect} />
              <button onClick={() => setShowStickers(v => !v)}
                className="shrink-0 w-8 h-8 flex items-center justify-center transition-transform hover:scale-110"
                style={{ color: showStickers ? "#FD79A8" : "#6b7280" }}>😀</button>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={onKey} rows={1}
                placeholder={`Сообщение в #${active?.name ?? "…"}`}
                disabled={!active}
                className="flex-1 bg-transparent outline-none resize-none text-base md:text-sm text-gray-200 placeholder-gray-700 py-1"
                style={{ maxHeight: 120, minHeight: 24, fontSize: '16px' }} />
              {input.trim() ? (
                <button onClick={() => sendMessage()} disabled={!active}
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                  style={{ background: "#FD79A8" }}>
                  <svg className="w-4 h-4" style={{ color: "#000" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              ) : (
                <button onClick={startRecording}
                  className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 hover:bg-white/5"
                  title="Голосовое сообщение">🎤</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
