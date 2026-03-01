import { NextResponse } from 'next/server';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
  <meta name="theme-color" content="#0A0C0F"/>
  <title>GodLocal Voice</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0A0C0F;
      --surface: #111316;
      --border: #1e2127;
      --green: #00FF9D;
      --purple: #6C5CE7;
      --text: #E0E0E0;
      --muted: rgba(224,224,224,0.45);
      --dim: rgba(224,224,224,0.18);
    }

    html, body {
      height: 100%; width: 100%;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }

    /* ── LAYOUT ─────────────────────────────── */
    #app {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    /* ── HEADER ─────────────────────────────── */
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      background: rgba(10,12,15,0.9);
      backdrop-filter: blur(12px);
      flex-shrink: 0;
      z-index: 10;
    }
    .logo {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; color: var(--text);
    }
    .logo-icon {
      width: 28px; height: 28px; border-radius: 7px;
      background: rgba(0,255,157,0.1);
      border: 1px solid rgba(0,255,157,0.3);
      display: flex; align-items: center; justify-content: center;
      font-family: monospace; font-weight: 700; font-size: 13px;
      color: var(--green);
    }
    .logo-text { font-weight: 700; font-size: 15px; }
    .logo-text span { color: var(--green); }
    .header-right { display: flex; align-items: center; gap: 10px; }
    .ws-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #555; transition: all 0.3s;
    }
    .ws-dot.connected { background: var(--green); box-shadow: 0 0 6px rgba(0,255,157,0.7); }
    .ws-dot.error { background: #FF6B6B; }
    #settings-btn {
      background: none; border: none; cursor: pointer;
      color: var(--muted); font-size: 18px; padding: 4px;
      transition: color 0.2s;
    }
    #settings-btn:hover { color: var(--text); }

    /* ── TRANSCRIPT AREA ─────────────────────── */
    #transcript {
      flex: 1;
      overflow-y: auto;
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    #transcript::-webkit-scrollbar { width: 3px; }
    #transcript::-webkit-scrollbar-track { background: transparent; }
    #transcript::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    .msg {
      display: flex;
      flex-direction: column;
      max-width: 82%;
      animation: fadeUp 0.25s ease;
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .msg.user { align-self: flex-end; align-items: flex-end; }
    .msg.agent { align-self: flex-start; align-items: flex-start; }

    .msg-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.55;
      position: relative;
    }
    .msg.user .msg-bubble {
      background: rgba(0,255,157,0.1);
      border: 1px solid rgba(0,255,157,0.2);
      border-bottom-right-radius: 4px;
      color: var(--text);
    }
    .msg.agent .msg-bubble {
      background: var(--surface);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
      color: var(--text);
    }
    .msg-time {
      font-size: 10px; color: var(--dim);
      margin-top: 3px; padding: 0 4px;
      font-family: monospace;
    }

    /* thinking dots */
    .thinking-dots { display: inline-flex; gap: 4px; align-items: center; }
    .thinking-dots span {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--green); opacity: 0.4;
      animation: blink 1.2s infinite;
    }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
      0%,80%,100% { opacity: 0.2; transform: scale(0.9); }
      40% { opacity: 1; transform: scale(1.1); }
    }

    /* ── LIVE TRANSCRIPT BAR ─────────────────── */
    #live-bar {
      flex-shrink: 0;
      padding: 6px 20px;
      min-height: 28px;
      display: flex; align-items: center;
      font-size: 13px;
      font-style: italic;
      color: var(--muted);
      transition: opacity 0.2s;
      opacity: 0;
    }
    #live-bar.visible { opacity: 1; }
    #live-text { flex: 1; }

    /* ── ORB ZONE ────────────────────────────── */
    #orb-zone {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px 20px 28px;
      background: linear-gradient(to top, rgba(0,255,157,0.03) 0%, transparent 100%);
      border-top: 1px solid var(--border);
    }

    #status-text {
      font-size: 12px;
      font-family: monospace;
      color: var(--muted);
      text-align: center;
      height: 16px;
      transition: color 0.2s;
    }
    #status-text.listening { color: var(--green); }
    #status-text.thinking { color: var(--purple); }
    #status-text.speaking { color: #00B4D8; }

    /* Orb button */
    #mic-btn {
      width: 72px; height: 72px; border-radius: 50%;
      border: none; cursor: pointer;
      background: var(--surface);
      border: 2px solid rgba(0,255,157,0.2);
      display: flex; align-items: center; justify-content: center;
      position: relative;
      transition: all 0.2s;
      -webkit-user-select: none; user-select: none;
      touch-action: manipulation;
    }
    #mic-btn:active { transform: scale(0.94); }
    #mic-btn.listening {
      background: rgba(0,255,157,0.1);
      border-color: var(--green);
      box-shadow: 0 0 0 0 rgba(0,255,157,0.4);
      animation: orbPulse 1.5s ease-in-out infinite;
    }
    #mic-btn.thinking {
      background: rgba(108,92,231,0.1);
      border-color: var(--purple);
    }
    #mic-btn.speaking {
      background: rgba(0,180,216,0.1);
      border-color: #00B4D8;
    }
    @keyframes orbPulse {
      0% { box-shadow: 0 0 0 0 rgba(0,255,157,0.4); }
      70% { box-shadow: 0 0 0 18px rgba(0,255,157,0); }
      100% { box-shadow: 0 0 0 0 rgba(0,255,157,0); }
    }
    #mic-icon { font-size: 28px; pointer-events: none; }

    /* Action row */
    #action-row {
      display: flex; gap: 10px; align-items: center;
    }
    .action-btn {
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 12px; font-family: monospace;
      border: 1px solid var(--border);
      background: none;
      color: var(--muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .action-btn:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

    /* ── SETTINGS PANEL ──────────────────────── */
    #settings-panel {
      position: absolute; inset: 0;
      background: rgba(10,12,15,0.97);
      backdrop-filter: blur(12px);
      z-index: 20;
      display: flex; flex-direction: column;
      padding: 24px 20px;
      gap: 20px;
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
    }
    #settings-panel.open { transform: translateX(0); }
    .settings-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 4px;
    }
    .settings-title { font-weight: 700; font-size: 16px; }
    #close-settings {
      background: none; border: none; cursor: pointer;
      color: var(--muted); font-size: 22px;
    }
    .setting-group label {
      display: block; font-size: 11px;
      font-family: monospace; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .setting-group select, .setting-group input {
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      padding: 10px 14px;
      font-size: 14px;
      outline: none;
    }
    .setting-group select:focus, .setting-group input:focus {
      border-color: rgba(0,255,157,0.4);
    }

    /* ── EMPTY STATE ─────────────────────────── */
    #empty {
      flex: 1;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 8px; color: var(--dim);
      text-align: center;
    }
    #empty .icon { font-size: 48px; opacity: 0.4; margin-bottom: 6px; }
    #empty p { font-size: 14px; line-height: 1.6; max-width: 220px; }
    #empty small { font-size: 11px; font-family: monospace; opacity: 0.6; }
  </style>
</head>
<body>
<div id="app">

  <!-- Header -->
  <header>
    <a class="logo" href="/">
      <div class="logo-icon">G</div>
      <div class="logo-text">God<span>Local</span> Voice</div>
    </a>
    <div class="header-right">
      <div class="ws-dot" id="ws-dot" title="API connection"></div>
      <button id="settings-btn" onclick="toggleSettings()" aria-label="Settings">⚙</button>
    </div>
  </header>

  <!-- Conversation -->
  <div id="transcript">
    <div id="empty">
      <div class="icon">🎙️</div>
      <p>Hold the button and speak.<br/>I'll think and reply aloud.</p>
      <small>Powered by GodLocal AI</small>
    </div>
  </div>

  <!-- Live interim text -->
  <div id="live-bar"><span id="live-text"></span></div>

  <!-- Orb zone -->
  <div id="orb-zone">
    <div id="status-text">tap and hold to speak</div>

    <button id="mic-btn"
      ontouchstart="startListen(event)"
      ontouchend="stopListen(event)"
      ontouchcancel="stopListen(event)"
      onmousedown="startListen(event)"
      onmouseup="stopListen(event)"
      onmouseleave="stopListen(event)"
    >
      <span id="mic-icon">🎤</span>
    </button>

    <div id="action-row">
      <button class="action-btn" onclick="toggleMute()" id="mute-btn">🔊 sound</button>
      <button class="action-btn" onclick="clearHistory()">🗑 clear</button>
    </div>
  </div>

  <!-- Settings Panel -->
  <div id="settings-panel">
    <div class="settings-header">
      <span class="settings-title">⚙ Settings</span>
      <button id="close-settings" onclick="toggleSettings()">×</button>
    </div>
    <div class="setting-group">
      <label>Voice</label>
      <select id="voice-select" onchange="saveVoice()">
        <option value="">Default</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Speech Rate</label>
      <input type="range" id="rate-slider" min="0.6" max="1.6" step="0.1" value="1.0" oninput="saveRate(this.value)"/>
    </div>
    <div class="setting-group">
      <label>Agent Persona</label>
      <select id="persona-select" onchange="savePersona()">
        <option value="jarvis">Jarvis — Precise & Fast</option>
        <option value="sage">Sage — Thoughtful & Deep</option>
        <option value="wolf">WOLF — Blunt & Direct</option>
      </select>
    </div>
    <div class="setting-group">
      <label>API Endpoint</label>
      <input type="text" id="api-input" placeholder="wss://godlocal-api.onrender.com/ws/chat" oninput="saveApi()"/>
    </div>
  </div>

</div>

<script>
// ── CONFIG ────────────────────────────────────────────────────────────
const DEFAULT_WS = 'wss://godlocal-api.onrender.com/ws/chat';
let cfg = {
  wsUrl: localStorage.getItem('voice_ws') || DEFAULT_WS,
  voice: localStorage.getItem('voice_name') || '',
  rate: parseFloat(localStorage.getItem('voice_rate') || '1.0'),
  persona: localStorage.getItem('voice_persona') || 'jarvis',
  muted: localStorage.getItem('voice_muted') === 'true',
};

// ── STATE ─────────────────────────────────────────────────────────────
let ws = null, wsReady = false;
let recognition = null, listening = false;
let synth = window.speechSynthesis;
let voices = [];
let currentThinkingId = null;
let msgCount = 0;
let speakQueue = [];
let isSpeaking = false;

const PERSONAS = {
  jarvis: 'You are Jarvis, a precise and fast AI assistant. Give concise, direct answers. Be helpful and efficient. Max 2-3 sentences unless asked for more.',
  sage: 'You are Sage, a thoughtful AI assistant. Give nuanced, insightful answers. Be wise and considerate.',
  wolf: 'You are WOLF. Be blunt, direct, no fluff. Short answers. Market mindset. No pleasantries.',
};

// ── DOM ───────────────────────────────────────────────────────────────
const $transcript = document.getElementById('transcript');
const $empty = document.getElementById('empty');
const $liveBar = document.getElementById('live-bar');
const $liveText = document.getElementById('live-text');
const $status = document.getElementById('status-text');
const $micBtn = document.getElementById('mic-btn');
const $micIcon = document.getElementById('mic-icon');
const $wsDot = document.getElementById('ws-dot');
const $muteBtn = document.getElementById('mute-btn');

// ── INIT ──────────────────────────────────────────────────────────────
function init() {
  document.getElementById('api-input').value = cfg.wsUrl;
  document.getElementById('rate-slider').value = cfg.rate;
  document.getElementById('persona-select').value = cfg.persona;
  $muteBtn.textContent = cfg.muted ? '🔇 muted' : '🔊 sound';
  loadVoices();
  connectWS();
}

// ── WEBSOCKET ─────────────────────────────────────────────────────────
function connectWS() {
  try {
    if (ws) { ws.onclose = null; ws.close(); }
    ws = new WebSocket(cfg.wsUrl);
    $wsDot.className = 'ws-dot';

    ws.onopen = () => {
      wsReady = true;
      $wsDot.className = 'ws-dot connected';
    };

    ws.onclose = () => {
      wsReady = false;
      $wsDot.className = 'ws-dot error';
      setTimeout(connectWS, 4000);
    };

    ws.onerror = () => {
      wsReady = false;
      $wsDot.className = 'ws-dot error';
    };

    ws.onmessage = (e) => {
      const data = typeof e.data === 'string' ? e.data : '';
      if (!data) return;

      // Remove thinking bubble
      if (currentThinkingId) {
        const el = document.getElementById(currentThinkingId);
        if (el) el.remove();
        currentThinkingId = null;
      }

      // Find or create streaming bubble
      let bubble = document.getElementById('streaming-bubble');
      if (!bubble) {
        bubble = addMessage('agent', '', { id: 'streaming-bubble', streaming: true });
      }
      const textEl = bubble.querySelector('.msg-text');
      textEl.textContent = (textEl.textContent || '') + data;
      $transcript.scrollTop = $transcript.scrollHeight;
    };

    // Detect stream end via silence (500ms with no new tokens)
    let streamTimer = null;
    const origOnMsg = ws.onmessage;
    ws.onmessage = (e) => {
      origOnMsg(e);
      clearTimeout(streamTimer);
      streamTimer = setTimeout(() => {
        const bubble = document.getElementById('streaming-bubble');
        if (bubble) {
          const text = bubble.querySelector('.msg-text').textContent;
          bubble.removeAttribute('id');
          speak(text);
        }
      }, 600);
    };

  } catch(err) {
    $wsDot.className = 'ws-dot error';
  }
}

function sendToAgent(text) {
  if (!text.trim()) return;

  addMessage('user', text);
  currentThinkingId = 'thinking-' + Date.now();
  addThinking(currentThinkingId);
  setStatus('thinking');

  const payload = JSON.stringify({
    message: text,
    system: PERSONAS[cfg.persona] || PERSONAS.jarvis,
    service_tokens: {},
  });

  if (wsReady && ws.readyState === WebSocket.OPEN) {
    ws.send(payload);
  } else {
    // HTTP fallback
    fetch('https://godlocal-api.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    .then(r => r.json())
    .then(d => {
      if (currentThinkingId) {
        const el = document.getElementById(currentThinkingId);
        if (el) el.remove();
        currentThinkingId = null;
      }
      const reply = d.response || d.message || d.text || JSON.stringify(d);
      addMessage('agent', reply);
      speak(reply);
    })
    .catch(() => {
      if (currentThinkingId) {
        const el = document.getElementById(currentThinkingId);
        if (el) el.remove();
        currentThinkingId = null;
      }
      const msg = "I couldn't connect to the agent. Check your network.";
      addMessage('agent', msg);
      speak(msg);
    });
  }
}

// ── SPEECH RECOGNITION ────────────────────────────────────────────────
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const r = new SpeechRecognition();
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 1;
  r.lang = 'ru-RU'; // can be overridden

  r.onresult = (e) => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    $liveText.textContent = final || interim;
    $liveBar.classList.toggle('visible', !!(final || interim));
    if (final) {
      stopListen();
      $liveBar.classList.remove('visible');
      sendToAgent(final.trim());
    }
  };

  r.onerror = (e) => {
    if (e.error === 'no-speech') {
      setStatus('tap and hold to speak');
    } else if (e.error === 'not-allowed') {
      setStatus('mic access denied');
    }
    resetMic();
  };

  r.onend = () => {
    if (listening) {
      // auto-restart if still holding
    } else {
      resetMic();
    }
  };

  return r;
}

function startListen(e) {
  e.preventDefault();
  if (isSpeaking) { synth.cancel(); isSpeaking = false; }
  if (listening) return;

  // Stop any speech
  synth.cancel();

  listening = true;
  $micBtn.className = 'listening';
  $micIcon.textContent = '🔴';
  setStatus('listening…', 'listening');

  recognition = initRecognition();
  if (recognition) {
    try { recognition.start(); } catch(e2) {}
  } else {
    // Fallback: type mode
    setStatus('speech not supported — type below', '');
  }
}

function stopListen(e) {
  if (e) e.preventDefault();
  if (!listening) return;
  listening = false;
  if (recognition) {
    try { recognition.stop(); } catch(e2) {}
  }
  resetMic();
}

function resetMic() {
  listening = false;
  $micBtn.className = '';
  $micIcon.textContent = '🎤';
  if (!currentThinkingId) setStatus('tap and hold to speak');
}

// ── TEXT TO SPEECH ────────────────────────────────────────────────────
function loadVoices() {
  const load = () => {
    voices = synth.getVoices();
    const sel = document.getElementById('voice-select');
    sel.innerHTML = '<option value="">Auto</option>';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = \`\${v.name} (\${v.lang})\`;
      if (v.name === cfg.voice) opt.selected = true;
      sel.appendChild(opt);
    });
  };
  load();
  synth.addEventListener('voiceschanged', load);
}

function speak(text) {
  if (cfg.muted || !text) return;
  setStatus('speaking…', 'speaking');
  $micBtn.className = 'speaking';
  $micIcon.textContent = '🔊';

  // Strip markdown
  const clean = text.replace(/[*_\`~#>]/g, '').replace(/https?:\/\/\S+/g, '').trim();
  const chunks = splitIntoChunks(clean, 180);

  let i = 0;
  isSpeaking = true;

  function next() {
    if (!isSpeaking || i >= chunks.length) {
      isSpeaking = false;
      resetMic();
      setStatus('tap and hold to speak');
      return;
    }
    const utt = new SpeechSynthesisUtterance(chunks[i++]);
    utt.rate = cfg.rate;
    utt.pitch = 1.0;
    if (cfg.voice) {
      const v = voices.find(v2 => v2.name === cfg.voice);
      if (v) utt.voice = v;
    }
    utt.onend = next;
    utt.onerror = next;
    synth.speak(utt);
  }
  next();
}

function splitIntoChunks(text, maxLen) {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) { chunks.push(cur.trim()); cur = s; }
    else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

// ── UI HELPERS ────────────────────────────────────────────────────────
function addMessage(role, text, opts = {}) {
  if ($empty) $empty.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  if (opts.id) wrap.id = opts.id;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const textEl = document.createElement('span');
  textEl.className = 'msg-text';
  textEl.textContent = text;
  bubble.appendChild(textEl);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  wrap.appendChild(bubble);
  wrap.appendChild(time);
  $transcript.appendChild(wrap);
  $transcript.scrollTop = $transcript.scrollHeight;
  return wrap;
}

function addThinking(id) {
  const wrap = document.createElement('div');
  wrap.className = 'msg agent';
  wrap.id = id;
  wrap.innerHTML = '<div class="msg-bubble"><div class="thinking-dots"><span></span><span></span><span></span></div></div>';
  $transcript.appendChild(wrap);
  $transcript.scrollTop = $transcript.scrollHeight;
}

function setStatus(text, cls = '') {
  $status.textContent = text;
  $status.className = cls;
}

// ── ACTIONS ───────────────────────────────────────────────────────────
function toggleMute() {
  cfg.muted = !cfg.muted;
  localStorage.setItem('voice_muted', cfg.muted);
  $muteBtn.textContent = cfg.muted ? '🔇 muted' : '🔊 sound';
  if (cfg.muted) { synth.cancel(); isSpeaking = false; resetMic(); }
}

function clearHistory() {
  $transcript.innerHTML = '';
  $transcript.appendChild($empty);
  $empty.style.display = '';
}

function toggleSettings() {
  document.getElementById('settings-panel').classList.toggle('open');
}

function saveVoice() {
  cfg.voice = document.getElementById('voice-select').value;
  localStorage.setItem('voice_name', cfg.voice);
}
function saveRate(v) {
  cfg.rate = parseFloat(v);
  localStorage.setItem('voice_rate', v);
}
function savePersona() {
  cfg.persona = document.getElementById('persona-select').value;
  localStorage.setItem('voice_persona', cfg.persona);
}
function saveApi() {
  const val = document.getElementById('api-input').value.trim() || DEFAULT_WS;
  cfg.wsUrl = val;
  localStorage.setItem('voice_ws', val);
  connectWS();
}

// ── START ─────────────────────────────────────────────────────────────
window.addEventListener('load', init);

// Keep synth alive on iOS
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isSpeaking) synth.cancel();
});
</script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
