'use server'
import { NextResponse } from 'next/server'

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>Флипер мемов — GodLocal</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#07090e;--bg1:#0a0c11;--bg2:#0d1018;--bg3:#131720;
  --border:#1a2030;
  --g:#30D158;--b:#007AFF;--r:#FF3B30;--p:#FF2D80;--c:#00CFFF;--y:#FF9F0A;--pu:#5856D6;
  --txt:#c8cdd8;--txt2:#5a6480;
}
html,body{height:100%;background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;overflow:hidden}
/* ── Layout ── */
#app{display:flex;flex-direction:column;height:100dvh;height:100vh;padding-top:env(safe-area-inset-top,0);padding-bottom:env(safe-area-inset-bottom,0)}
/* ── BG layers ── */
#bg{position:fixed;inset:0;z-index:0;pointer-events:none}
.bg-glow{position:absolute;border-radius:50%;filter:blur(60px)}
.bg-g1{width:70vw;height:70vw;top:-15%;right:-15%;background:radial-gradient(circle,rgba(255,45,128,.18) 0%,transparent 70%)}
.bg-g2{width:60vw;height:60vw;bottom:-10%;left:-10%;background:radial-gradient(circle,rgba(0,207,255,.14) 0%,transparent 70%)}
.bg-g3{width:80vw;height:40vw;top:40%;left:50%;transform:translateX(-50%);background:radial-gradient(ellipse,rgba(88,86,214,.08) 0%,transparent 70%)}
.bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,207,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,207,255,.03) 1px,transparent 1px);background-size:36px 36px}
/* ── Header ── */
#hdr{position:relative;z-index:10;display:flex;align-items:center;gap:8px;padding:10px 14px 6px;background:rgba(7,9,14,.8);border-bottom:1px solid var(--border);backdrop-filter:blur(16px);flex-shrink:0}
#hdr-logo{font-size:16px;font-weight:700;background:linear-gradient(135deg,var(--p),var(--c));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.5px;flex:1}
#hdr-logo span{font-weight:400;opacity:.7;font-size:13px}
#wallet-btn{font-size:11px;font-weight:600;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.6);cursor:pointer;white-space:nowrap;transition:all .2s}
#wallet-btn.connected{border-color:rgba(48,209,88,.4);background:rgba(48,209,88,.1);color:var(--g)}
#sol-bal{font-size:11px;color:var(--c);font-weight:600;min-width:48px;text-align:right}
/* ── Stats row ── */
#stats-row{position:relative;z-index:10;display:flex;gap:6px;padding:8px 14px;flex-shrink:0}
.stat-pill{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:7px 8px;text-align:center;backdrop-filter:blur(8px)}
.stat-val{font-size:16px;font-weight:700;letter-spacing:-.5px}
.stat-lbl{font-size:9px;color:var(--txt2);margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
/* ── Tab bar ── */
#tabbar{position:relative;z-index:10;display:flex;gap:4px;padding:6px 14px 4px;flex-shrink:0}
.tab{flex:1;padding:8px 4px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:var(--txt2);font-size:12px;font-weight:600;cursor:pointer;text-align:center;transition:all .2s;letter-spacing:.3px}
.tab.on{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff}
/* ── Panels ── */
#panels{position:relative;z-index:5;flex:1;min-height:0;overflow:hidden}
.panel{display:none;flex-direction:column;height:100%;padding:10px 14px 12px;overflow-y:auto;-webkit-overflow-scrolling:touch;gap:10px}
.panel.on{display:flex}
/* ── Token card ── */
#token-card{border-radius:20px;background:rgba(12,15,22,.8);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(24px);overflow:hidden;transition:border-color .4s,box-shadow .4s;flex-shrink:0}
#token-card.buy-mode{border-color:rgba(48,209,88,.35);box-shadow:0 0 30px rgba(48,209,88,.15)}
#token-card.sell-mode{border-color:rgba(255,59,48,.3);box-shadow:0 0 30px rgba(255,59,48,.12)}
.tc-head{display:flex;align-items:center;gap:12px;padding:14px 16px 10px}
.tc-icon{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,rgba(255,45,128,.25),rgba(0,207,255,.25));display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;border:1px solid rgba(255,255,255,.08)}
.tc-name{font-size:19px;font-weight:700;letter-spacing:-.5px}
.tc-sub{font-size:11px;color:var(--txt2);margin-top:2px}
.tc-price{text-align:right}
.tc-p{font-size:17px;font-weight:600}
.tc-chg{font-size:12px;font-weight:700;margin-top:2px}
.tc-chg.up{color:var(--g)}.tc-chg.dn{color:var(--r)}
.tc-meta{display:flex;gap:6px;padding:0 16px 10px;flex-wrap:wrap}
.tc-tag{font-size:11px;padding:3px 9px;border-radius:8px;background:rgba(255,255,255,.06);color:var(--txt2)}
/* AI Score */
.ai-score-row{display:flex;align-items:center;gap:10px;padding:0 16px 8px}
.ai-score-bar{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.ai-score-fill{height:100%;border-radius:3px;transition:width 1s ease}
.ai-score-val{font-size:13px;font-weight:700;min-width:36px;text-align:right}
.ai-score-lbl{font-size:11px;color:var(--txt2);min-width:56px}
/* X badge */
.x-badge{margin:0 16px 10px;border-radius:12px;background:linear-gradient(135deg,rgba(255,45,128,.1),rgba(88,86,214,.1));border:1px solid rgba(255,45,128,.2);padding:8px 14px;display:flex;align-items:center;gap:10px}
.x-pot{font-size:21px;font-weight:800;background:linear-gradient(135deg,var(--p),var(--y));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-1px}
.x-lbl{font-size:11px;color:var(--txt2)}
/* Timer */
#timer-wrap{padding:4px 16px 14px}
#timer-bar-bg{height:3px;border-radius:2px;background:rgba(255,255,255,.07);overflow:hidden}
#timer-bar{height:100%;border-radius:2px;transition:width .1s linear,background .3s}
#timer-foot{display:flex;justify-content:space-between;margin-top:5px}
#timer-sec{font-size:11px;font-weight:600}
#timer-hint{font-size:11px;color:var(--txt2)}
/* SOL picker */
#sol-picker{display:flex;gap:6px;flex-shrink:0}
.sol-btn{flex:1;padding:9px 4px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--txt2);font-size:12px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}
.sol-btn.on{background:rgba(0,207,255,.12);border-color:rgba(0,207,255,.4);color:var(--c)}
/* Action buttons */
#action-row{display:flex;gap:10px;flex-shrink:0;margin-top:2px}
#btn-flip{flex:2;padding:16px 0;border-radius:18px;border:none;cursor:pointer;font-size:15px;font-weight:700;letter-spacing:.2px;background:linear-gradient(135deg,#30D158,#34C759);color:#fff;box-shadow:0 4px 20px rgba(48,209,88,.4);transition:transform .1s,box-shadow .1s;-webkit-tap-highlight-color:transparent}
#btn-flip:active{transform:scale(.96);box-shadow:0 2px 10px rgba(48,209,88,.3)}
#btn-pass{flex:1;padding:16px 0;border-radius:18px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:15px;font-weight:600;background:rgba(255,255,255,.05);color:rgba(255,255,255,.45);backdrop-filter:blur(8px);transition:transform .1s;-webkit-tap-highlight-color:transparent}
#btn-pass:active{transform:scale(.96)}
/* Loading spinner */
.spinner{width:20px;height:20px;border:2px solid rgba(255,255,255,.1);border-top-color:var(--c);border-radius:50%;animation:spin .8s linear infinite;margin:auto}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes bgPulse{0%,100%{opacity:1}50%{opacity:.75}}
#bg{animation:bgPulse 5s ease-in-out infinite alternate}
/* Portfolio mini */
#portfolio-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;flex-shrink:0}
.pos-chip{flex-shrink:0;padding:6px 10px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:11px;cursor:pointer;white-space:nowrap}
.pos-chip.profit{border-color:rgba(48,209,88,.3);background:rgba(48,209,88,.06)}
.pos-chip.loss{border-color:rgba(255,59,48,.2);background:rgba(255,59,48,.05)}
/* X tab */
.x-tweet{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);font-size:13px;line-height:1.5;color:var(--txt)}
.x-tweet .x-handle{color:var(--c);font-weight:600;font-size:12px;margin-bottom:4px}
.x-tweet .x-time{color:var(--txt2);font-size:11px;float:right}
.x-search-row{display:flex;gap:8px;flex-shrink:0}
#x-search-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px 14px;font-size:15px;color:#fff;outline:none}
#x-search-btn{padding:10px 16px;border-radius:14px;border:none;background:rgba(0,207,255,.15);border:1px solid rgba(0,207,255,.3);color:var(--c);font-size:13px;font-weight:600;cursor:pointer}
/* AI tab */
#ai-chat{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;min-height:0;-webkit-overflow-scrolling:touch}
.ai-msg{padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.6;max-width:90%;animation:fadeUp .3s ease both}
.ai-msg.ai{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-start}
.ai-msg.user{background:rgba(0,122,255,.15);border:1px solid rgba(0,122,255,.25);align-self:flex-end;text-align:right}
#ai-input-row{display:flex;gap:8px;flex-shrink:0;margin-top:4px}
#ai-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:10px 14px;font-size:15px;color:#fff;outline:none;resize:none}
#ai-send{width:44px;height:44px;border-radius:14px;border:none;background:var(--b);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
/* Result toast */
#result-toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:20px;font-size:15px;font-weight:700;z-index:100;pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap;backdrop-filter:blur(16px)}
#result-toast.win{background:rgba(48,209,88,.25);border:1px solid rgba(48,209,88,.5);color:var(--g)}
#result-toast.loss{background:rgba(255,59,48,.2);border:1px solid rgba(255,59,48,.4);color:var(--r)}
#result-toast.show{opacity:1}
/* Disable buttons while processing */
.disabled{opacity:.4;pointer-events:none}
/* No token state */
#no-token{text-align:center;padding:40px 20px;color:var(--txt2);font-size:14px}
</style>
</head>
<body>
<div id="bg">
  <div class="bg-glow bg-g1"></div>
  <div class="bg-glow bg-g2"></div>
  <div class="bg-glow bg-g3"></div>
  <div class="bg-grid"></div>
</div>

<div id="app">
  <!-- Header -->
  <div id="hdr">
    <div id="hdr-logo">⚡ Флипер мемов <span>SOL</span></div>
    <div id="sol-bal" style="display:none"></div>
    <button id="wallet-btn" onclick="connectPhantom()">👻 Войти</button>
  </div>

  <!-- Stats -->
  <div id="stats-row">
    <div class="stat-pill"><div class="stat-val" id="s-spd" style="color:#FF9F0A">—</div><div class="stat-lbl">⚡ Скорость</div></div>
    <div class="stat-pill"><div class="stat-val" id="s-acc" style="color:#30D158">—</div><div class="stat-lbl">🎯 Меткость</div></div>
    <div class="stat-pill"><div class="stat-val" id="s-x"   style="color:#FF2D80">—</div><div class="stat-lbl">✕ Лучший x</div></div>
  </div>

  <!-- Tabs -->
  <div id="tabbar">
    <div class="tab on" id="t-flip" onclick="switchTab('flip')">⚡ ФЛИП</div>
    <div class="tab"    id="t-x"    onclick="switchTab('x')">𝕏 НОВОСТИ</div>
    <div class="tab"    id="t-ai"   onclick="switchTab('ai')">🤖 АИ</div>
  </div>

  <!-- Panels -->
  <div id="panels">
    <!-- FLIP panel -->
    <div class="panel on" id="panel-flip">
      <div id="token-card">
        <div id="no-token"><div class="spinner"></div><div style="margin-top:12px">Загружаю токены…</div></div>
      </div>
      <div id="sol-picker">
        <div class="sol-btn" onclick="setSol(0.05)">0.05</div>
        <div class="sol-btn on" onclick="setSol(0.1)">0.1</div>
        <div class="sol-btn" onclick="setSol(0.5)">0.5</div>
        <div class="sol-btn" onclick="setSol(1)">1 SOL</div>
      </div>
      <div id="action-row">
        <button id="btn-flip" onclick="doFlip()">⚡ ФЛИПНУТЬ</button>
        <button id="btn-pass" onclick="doPass()">ПАСС</button>
      </div>
      <!-- Portfolio row -->
      <div id="portfolio-row"></div>
    </div>

    <!-- X panel -->
    <div class="panel" id="panel-x">
      <div class="x-search-row">
        <input id="x-search-input" placeholder="$PEPE, BONK, WIF…" />
        <button id="x-search-btn" onclick="searchX()">Найти</button>
      </div>
      <div id="x-feed" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- AI panel -->
    <div class="panel" id="panel-ai" style="display:none;flex-direction:column">
      <div id="ai-chat"></div>
      <div id="ai-input-row">
        <textarea id="ai-input" rows="1" placeholder="Спроси по токену…"></textarea>
        <button id="ai-send" onclick="sendAi()">↑</button>
      </div>
    </div>
  </div>
</div>

<div id="result-toast"></div>

<script>
// ── Constants ──────────────────────────────
const DEX      = 'https://api.dexscreener.com';
const WS_URL   = 'wss://godlocal-api.onrender.com/ws/search';
const WSOL     = 'So11111111111111111111111111111111111111112';
const JUP_Q    = 'https://quote-api.jup.ag/v6/quote';
const JUP_SW   = 'https://quote-api.jup.ag/v6/swap';

// ── State ──────────────────────────────────
let phantomPubkey = null;
let solBalance    = 0;
let currentToken  = null;
let tokenQueue    = [];
let qkSol         = 0.1;
let stats = JSON.parse(localStorage.getItem('fl_stats') || '{"flips":0,"wins":0,"totalMs":0,"bestX":0}');
let portfolio = JSON.parse(localStorage.getItem('fl_portfolio') || '[]');
let tokenStartTime = 0;
let timerInterval  = null;
let timerLeft      = 5000;
let activeTab      = 'flip';
let aiWs           = null;
let currentAiReply = '';
let quoteCache     = null; // pre-fetched Jupiter quote

// ── Phantom Wallet ─────────────────────────
async function connectPhantom(){
  const p = window.solana || window.phantom?.solana;
  if(!p || !p.isPhantom){
    if(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)){
      const u = encodeURIComponent(location.href);
      setTimeout(()=>{ location.href = 'https://phantom.app/ul/browse/'+u+'?ref='+u; }, 300);
    } else {
      toast('👻 Phantom не найден — установи расширение', 'loss');
    }
    return;
  }
  try {
    const r = await p.connect();
    phantomPubkey = r.publicKey.toString();
    document.getElementById('wallet-btn').textContent = phantomPubkey.slice(0,4)+'…'+phantomPubkey.slice(-4);
    document.getElementById('wallet-btn').classList.add('connected');
    fetchSolBalance();
  } catch(e){ console.error(e); }
}

async function fetchSolBalance(){
  if(!phantomPubkey) return;
  try {
    const r = await fetch('https://api.mainnet-beta.solana.com', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[phantomPubkey]})
    });
    const d = await r.json();
    solBalance = (d.result?.value||0)/1e9;
    const el = document.getElementById('sol-bal');
    el.textContent = solBalance.toFixed(3)+' SOL';
    el.style.display = 'block';
  } catch(e){}
}

// ── DexScreener Feed ───────────────────────
async function loadTokenQueue(){
  try {
    // Fetch boosted/trending Solana tokens from DexScreener
    const r = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
    if(!r.ok) throw new Error('dex '+r.status);
    const data = await r.json();
    const tokens = (Array.isArray(data) ? data : []).filter(t=>
      t.chainId==='solana' && t.tokenAddress
    );
    if(tokens.length>0){
      // Enrich with pair data
      const addrs = tokens.slice(0,8).map(t=>t.tokenAddress).join(',');
      const pr = await fetch(\`\${DEX}/latest/dex/tokens/\${addrs}\`);
      const pd = await pr.json();
      const pairs = (pd.pairs||[]).filter(p=>p.chainId==='solana' && parseFloat(p.liquidity?.usd||0)>2000);
      tokenQueue = pairs.map(p=>({
        mint   : p.baseToken?.address,
        sym    : p.baseToken?.symbol||'???',
        name   : p.baseToken?.name||'',
        price  : parseFloat(p.priceUsd||0),
        change : parseFloat(p.priceChange?.h24||0),
        mcap   : p.marketCap ? formatNum(p.marketCap) : '?',
        vol    : p.volume?.h24 ? formatNum(p.volume.h24) : '?',
        liq    : parseFloat(p.liquidity?.usd||0),
        age    : p.pairCreatedAt ? Math.round((Date.now()-p.pairCreatedAt)/60000) : null,
        pairUrl: p.url,
        buys   : p.txns?.h1?.buys||0,
        sells  : p.txns?.h1?.sells||0,
      }));
    }
  } catch(e){
    console.warn('boosted failed, trying search:', e);
    await loadFromSearch();
  }
  if(tokenQueue.length===0) await loadFromSearch();
  nextToken();
}

async function loadFromSearch(){
  try {
    const r = await fetch(\`\${DEX}/latest/dex/search?q=solana+meme\`);
    const d = await r.json();
    const pairs = (d.pairs||[]).filter(p=>p.chainId==='solana' && parseFloat(p.liquidity?.usd||0)>1000);
    tokenQueue = pairs.slice(0,10).map(p=>({
      mint   : p.baseToken?.address,
      sym    : p.baseToken?.symbol||'???',
      name   : p.baseToken?.name||'',
      price  : parseFloat(p.priceUsd||0),
      change : parseFloat(p.priceChange?.h24||0),
      mcap   : p.marketCap ? formatNum(p.marketCap) : '?',
      vol    : p.volume?.h24 ? formatNum(p.volume.h24) : '?',
      liq    : parseFloat(p.liquidity?.usd||0),
      age    : p.pairCreatedAt ? Math.round((Date.now()-p.pairCreatedAt)/60000) : null,
      pairUrl: p.url,
      buys   : p.txns?.h1?.buys||0,
      sells  : p.txns?.h1?.sells||0,
    }));
  } catch(e){ console.error(e); }
}

function nextToken(){
  clearTimer();
  if(tokenQueue.length===0){
    loadTokenQueue(); return;
  }
  currentToken = tokenQueue.shift();
  quoteCache = null;
  renderToken(currentToken);
  startTimer();
  prefetchQuote();
  quickAiScore(currentToken);
  if(tokenQueue.length<3) loadTokenQueue();
}

function renderToken(t){
  if(!t){ document.getElementById('token-card').innerHTML='<div id="no-token"><div class="spinner"></div></div>'; return; }
  const chgClass = t.change>=0 ? 'up' : 'dn';
  const chgStr   = (t.change>=0?'+':'')+t.change.toFixed(1)+'%';
  const priceStr = t.price<0.000001 ? t.price.toExponential(2) : t.price<0.001 ? t.price.toFixed(7) : t.price<1 ? t.price.toFixed(4) : t.price.toFixed(2);
  const potX = computePotX(t);
  const ageStr = t.age ? (t.age<60 ? t.age+'м' : Math.round(t.age/60)+'ч') : '?';
  document.getElementById('token-card').innerHTML = \`
    <div class="tc-head">
      <div class="tc-icon">\${symEmoji(t.sym)}</div>
      <div style="flex:1">
        <div class="tc-name">\${t.sym}</div>
        <div class="tc-sub">\${t.name||'Solana'}</div>
      </div>
      <div class="tc-price">
        <div class="tc-p">$\${priceStr}</div>
        <div class="tc-chg \${chgClass}">\${chgStr}</div>
      </div>
    </div>
    <div class="tc-meta">
      <div class="tc-tag">MCap \${t.mcap}</div>
      <div class="tc-tag">Vol \${t.vol}</div>
      <div class="tc-tag">Liq \${formatNum(t.liq)}</div>
      <div class="tc-tag">Возраст \${ageStr}</div>
      <div class="tc-tag">🟢\${t.buys}/🔴\${t.sells}</div>
    </div>
    <div class="ai-score-row" id="ai-score-row">
      <div class="ai-score-lbl" style="font-size:11px;color:var(--txt2)">AI Оценка</div>
      <div class="ai-score-bar"><div class="ai-score-fill" id="ai-score-fill" style="width:0%;background:var(--y)"></div></div>
      <div class="ai-score-val" id="ai-score-val" style="color:var(--y)">…</div>
    </div>
    <div class="x-badge">
      <div>
        <div class="x-lbl">потенциал ×</div>
        <div class="x-pot" id="x-pot">\${potX}x</div>
      </div>
      <div style="flex:1"></div>
      <a href="\${t.pairUrl||'https://dexscreener.com'}" target="_blank" style="font-size:11px;color:var(--c);text-decoration:none">DexScreener ↗</a>
    </div>
    <div id="timer-wrap">
      <div id="timer-bar-bg"><div id="timer-bar" style="width:100%;background:var(--g)"></div></div>
      <div id="timer-foot"><div id="timer-hint" class="timer-hint">решай быстро</div><div id="timer-sec" style="color:var(--g)">5.0с</div></div>
    </div>
  \`;
  document.getElementById('token-card').classList.remove('buy-mode','sell-mode');
}

// ── Timer ──────────────────────────────────
function startTimer(){
  timerLeft = 5000;
  tokenStartTime = Date.now();
  timerInterval = setInterval(()=>{
    timerLeft -= 100;
    if(timerLeft <= 0){ timerLeft=0; clearInterval(timerInterval); doPass(); return; }
    const pct = timerLeft/5000;
    const clr = pct>.5 ? 'var(--g)' : pct>.25 ? 'var(--y)' : 'var(--r)';
    const bar = document.getElementById('timer-bar');
    const sec = document.getElementById('timer-sec');
    if(bar){ bar.style.width=(pct*100)+'%'; bar.style.background=clr; }
    if(sec){ sec.textContent=(timerLeft/1000).toFixed(1)+'с'; sec.style.color=clr; }
  }, 100);
}

function clearTimer(){ clearInterval(timerInterval); }

// ── Jupiter Pre-fetch quote ───────────────
async function prefetchQuote(){
  if(!currentToken?.mint) return;
  try {
    const amt = Math.round(qkSol*1e9);
    const r = await fetch(\`\${JUP_Q}?inputMint=\${WSOL}&outputMint=\${currentToken.mint}&amount=\${amt}&slippageBps=500\`);
    quoteCache = r.ok ? await r.json() : null;
  } catch(e){ quoteCache=null; }
}

// ── Buy / Pass ─────────────────────────────
async function doFlip(){
  if(!currentToken) return;
  clearTimer();
  const ms = Date.now()-tokenStartTime;
  document.getElementById('btn-flip').classList.add('disabled');
  document.getElementById('btn-pass').classList.add('disabled');

  if(!phantomPubkey){
    await connectPhantom();
    if(!phantomPubkey){
      document.getElementById('btn-flip').classList.remove('disabled');
      document.getElementById('btn-pass').classList.remove('disabled');
      startTimer(); return;
    }
  }

  // Add to portfolio immediately (optimistic)
  const pos = { mint:currentToken.mint, sym:currentToken.sym, buyPrice:currentToken.price, buyTime:Date.now(), solSpent:qkSol, status:'open' };
  portfolio.push(pos);
  savePortfolio();
  updatePortfolioRow();

  // Record speed
  stats.flips++;
  stats.totalMs += ms;
  saveStats(); updateStatsRow();

  document.getElementById('token-card').classList.add('buy-mode');
  toast(\`⚡ Покупаю \${currentToken.sym} за \${qkSol} SOL…\`, 'win');

  try {
    const lamports = Math.round(qkSol*1e9);
    // Use cached quote or fetch fresh
    let q = quoteCache;
    if(!q || q.error){
      const qr = await fetch(\`\${JUP_Q}?inputMint=\${WSOL}&outputMint=\${currentToken.mint}&amount=\${lamports}&slippageBps=500\`);
      q = await qr.json();
    }
    if(q.error) throw new Error(q.error);

    const swapR = await fetch(JUP_SW, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ quoteResponse:q, userPublicKey:phantomPubkey,
        wrapAndUnwrapSol:true, dynamicComputeUnitLimit:true,
        prioritizationFeeLamports:'auto' })
    });
    if(!swapR.ok) throw new Error('swap '+swapR.status);
    const { swapTransaction } = await swapR.json();
    const txBuf = Uint8Array.from(atob(swapTransaction), c=>c.charCodeAt(0));

    const phantom = window.solana || window.phantom?.solana;
    const { signature } = await phantom.signAndSendTransaction({ serialize: ()=>txBuf, serializeMessage:()=>txBuf });
    toast(\`✅ \${currentToken.sym} куплен! TX: \${signature.slice(0,8)}…\`, 'win');
    pos.signature = signature;
    savePortfolio();
  } catch(e){
    toast(\`❌ Ошибка: \${e.message}\`, 'loss');
  }

  setTimeout(()=>{
    document.getElementById('btn-flip').classList.remove('disabled');
    document.getElementById('btn-pass').classList.remove('disabled');
    nextToken();
  }, 1500);
}

async function doSell(mint, sym){
  if(!phantomPubkey){ connectPhantom(); return; }
  const pos = portfolio.find(p=>p.mint===mint && p.status==='open');
  if(!pos){ toast('Позиция не найдена', 'loss'); return; }
  try {
    toast(\`⚡ Продаю \${sym}…\`, 'win');
    // Get token balance
    const br = await fetch('https://api.mainnet-beta.solana.com', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenAccountsByOwner',
        params:[phantomPubkey,{mint},{encoding:'jsonParsed'}]})
    });
    const bd = await br.json();
    const accts = bd.result?.value||[];
    if(!accts.length){ toast('Баланс токена не найден', 'loss'); return; }
    const tokenAmt = accts[0].account.data.parsed.info.tokenAmount;
    const amt = parseInt(tokenAmt.amount);
    const dec = tokenAmt.decimals;

    const q = await fetch(\`\${JUP_Q}?inputMint=\${mint}&outputMint=\${WSOL}&amount=\${amt}&slippageBps=500\`).then(r=>r.json());
    if(q.error) throw new Error(q.error);
    const swapR = await fetch(JUP_SW,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({quoteResponse:q,userPublicKey:phantomPubkey,wrapAndUnwrapSol:true,dynamicComputeUnitLimit:true,prioritizationFeeLamports:'auto'})});
    const { swapTransaction } = await swapR.json();
    const txBuf = Uint8Array.from(atob(swapTransaction), c=>c.charCodeAt(0));
    const phantom = window.solana || window.phantom?.solana;
    const { signature } = await phantom.signAndSendTransaction({serialize:()=>txBuf,serializeMessage:()=>txBuf});

    // Mark position closed
    pos.status = 'closed';
    pos.closeTime = Date.now();
    const outSol = parseFloat(q.outAmount||0)/1e9;
    const profit = outSol - pos.solSpent;
    pos.xAchieved = outSol/pos.solSpent;
    if(profit>0){
      stats.wins++;
      if(pos.xAchieved>stats.bestX) stats.bestX = Math.round(pos.xAchieved*10)/10;
    }
    saveStats(); savePortfolio(); updateStatsRow(); updatePortfolioRow();
    toast(\`\${profit>=0?'✅':'💀'} \${sym} продан. \${profit>=0?'+':''}Δ \${outSol.toFixed(4)} SOL (\${pos.xAchieved.toFixed(2)}×)\`, profit>=0?'win':'loss');
  } catch(e){ toast(\`❌ \${e.message}\`, 'loss'); }
}

function doPass(){
  clearTimer();
  nextToken();
}

// ── SOL picker ─────────────────────────────
function setSol(v){
  qkSol = v;
  document.querySelectorAll('.sol-btn').forEach(b=>{ b.classList.remove('on'); if(parseFloat(b.textContent)===v||(v===1&&b.textContent==='1 SOL')) b.classList.add('on'); });
  prefetchQuote();
}

// ── AI Quick Score ─────────────────────────
function quickAiScore(t){
  // Heuristic AI score (0-100)
  let score = 50;
  if(t.change>100) score += 15; else if(t.change>50) score += 8; else if(t.change<-50) score -= 20;
  const liqK = t.liq/1000;
  if(liqK>100) score += 10; else if(liqK>20) score += 5; else if(liqK<5) score -= 15;
  const bsRatio = t.buys/(t.sells||1);
  if(bsRatio>2) score += 12; else if(bsRatio>1.2) score += 6; else if(bsRatio<0.5) score -= 12;
  if(t.age && t.age<30) score -= 10; else if(t.age && t.age<120) score += 5;
  score = Math.max(5, Math.min(95, score));

  const fill = document.getElementById('ai-score-fill');
  const val  = document.getElementById('ai-score-val');
  if(!fill||!val) return;
  const clr = score>=65?'var(--g)':score>=45?'var(--y)':'var(--r)';
  fill.style.width = score+'%';
  fill.style.background = clr;
  val.textContent = score+'/100';
  val.style.color = clr;

  // Enhanced WS analysis
  wsAiScore(t, score);
}

function wsAiScore(t, baseScore){
  try {
    const ws = new WebSocket(WS_URL);
    const prompt = \`Токен \${t.sym} на Solana. MCap:\${t.mcap}, Vol:\${t.vol}, Liq:\$\${Math.round(t.liq)}, Покупки:\${t.buys}, Продажи:\${t.sells}, Изменение 24ч:\${t.change}%. Дай оценку 0-100 (можно ли флипнуть быстро) и 1 ключевой сигнал. Ответь кратко: "Оценка: X/100. [Сигнал]"\`;
    ws.onopen = ()=>ws.send(JSON.stringify({prompt, session_id:'fl-score'}));
    let reply = '';
    ws.onmessage = e=>{
      try {
        const d = JSON.parse(e.data);
        if(d.t==='token') reply += d.v||'';
        if(d.t==='done'){
          ws.close();
          const m = reply.match(/[Оо]ценка:?\s*(\d+)/);
          if(m){
            const s = parseInt(m[1]);
            const fill=document.getElementById('ai-score-fill');
            const val =document.getElementById('ai-score-val');
            if(fill&&val){
              const clr=s>=65?'var(--g)':s>=45?'var(--y)':'var(--r)';
              fill.style.width=s+'%'; fill.style.background=clr;
              val.textContent=s+'/100'; val.style.color=clr;
              val.title=reply;
            }
          }
        }
      } catch(e2){}
    };
    ws.onerror=()=>ws.close();
    setTimeout(()=>{ try{ws.close()}catch(e){} },10000);
  } catch(e){}
}

// ── X/Twitter News ─────────────────────────
async function searchX(){
  const q = document.getElementById('x-search-input').value.trim() || (currentToken?.sym||'SOL');
  const feed = document.getElementById('x-feed');
  feed.innerHTML = '<div class="spinner" style="margin-top:20px"></div>';
  try {
    const r = await fetch(\`/api/x-news?q=\${encodeURIComponent('$'+q+' crypto memecoin')}\`);
    if(!r.ok) throw new Error(r.status);
    const data = await r.json();
    if(!data.results || !data.results.length){
      feed.innerHTML = '<div style="color:var(--txt2);font-size:13px;padding:20px;text-align:center">Нет результатов. Добавь SERPER_API_KEY в Vercel.</div>';
      return;
    }
    feed.innerHTML = data.results.slice(0,12).map(item=>\`
      <div class="x-tweet">
        <div class="x-handle">\${item.source||'𝕏'}</div>
        <div>\${item.snippet||item.title||''}</div>
        <div style="margin-top:6px"><a href="\${item.link}" target="_blank" style="color:var(--c);font-size:11px;text-decoration:none">Открыть ↗</a></div>
      </div>
    \`).join('');
  } catch(e){
    feed.innerHTML = \`<div style="color:var(--txt2);font-size:13px;padding:20px;text-align:center">Ошибка: \${e.message}<br><br>Нужен SERPER_API_KEY в Vercel</div>\`;
  }
}

// ── AI Chat ────────────────────────────────
function switchTab(tab){
  activeTab = tab;
  ['flip','x','ai'].forEach(t=>{
    document.getElementById('t-'+t).classList.toggle('on', t===tab);
    document.getElementById('panel-'+t).classList.toggle('on', t===tab);
    document.getElementById('panel-'+t).style.display = t===tab ? 'flex' : 'none';
  });
  if(tab==='x' && currentToken) document.getElementById('x-search-input').value = currentToken.sym;
  if(tab==='flip') document.getElementById('panel-flip').style.display='flex';
}

function sendAi(){
  const inp = document.getElementById('ai-input');
  const q = inp.value.trim(); if(!q) return;
  inp.value='';
  const chat = document.getElementById('ai-chat');
  chat.innerHTML += \`<div class="ai-msg user">\${q}</div>\`;
  const bot = document.createElement('div');
  bot.className='ai-msg ai'; bot.textContent='…'; chat.appendChild(bot); chat.scrollTop=9999;
  try {
    const ws = new WebSocket(WS_URL);
    const ctx = currentToken ? \`Контекст: токен \${currentToken.sym}, цена $\${currentToken.price}, изм \${currentToken.change}%. \` : '';
    ws.onopen=()=>ws.send(JSON.stringify({prompt:ctx+q, session_id:'fl-ai'}));
    let reply='';
    ws.onmessage=e=>{
      try {
        const d=JSON.parse(e.data);
        if(d.t==='token'){reply+=d.v||''; bot.textContent=reply; chat.scrollTop=9999;}
        if(d.t==='done'){ws.close();}
      } catch(e2){}
    };
    ws.onerror=()=>{ bot.textContent='⚠️ Ошибка подключения'; ws.close(); };
    setTimeout(()=>{ try{ws.close()}catch(e){} }, 30000);
  } catch(e){ bot.textContent='⚠️ '+e.message; }
}

document.getElementById('ai-input').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAi();}
});

// ── Portfolio UI ───────────────────────────
function updatePortfolioRow(){
  const row = document.getElementById('portfolio-row');
  const openPos = portfolio.filter(p=>p.status==='open');
  row.innerHTML = openPos.map(p=>\`
    <div class="pos-chip" onclick="doSell('\${p.mint}','\${p.sym}')">
      \${p.sym} 💰 \${p.solSpent}◎ • нажми чтобы продать
    </div>
  \`).join('');
}

// ── Stats ──────────────────────────────────
function updateStatsRow(){
  const acc = stats.flips>0 ? Math.round(stats.wins/stats.flips*100) : null;
  const spd = stats.flips>0 ? (stats.totalMs/stats.flips/1000).toFixed(1) : null;
  document.getElementById('s-spd').textContent = spd ? spd+'с' : '—';
  document.getElementById('s-acc').textContent = acc!=null ? acc+'%' : '—';
  document.getElementById('s-x').textContent   = stats.bestX>0 ? stats.bestX+'x' : '—';
}

// ── Helpers ────────────────────────────────
function formatNum(n){
  if(n>=1e9) return (n/1e9).toFixed(1)+'B';
  if(n>=1e6) return (n/1e6).toFixed(1)+'M';
  if(n>=1e3) return (n/1e3).toFixed(0)+'K';
  return n.toFixed(0);
}

function computePotX(t){
  const base = Math.abs(t.change)/100 + 1;
  const liqMul = t.liq<10000 ? 2.5 : t.liq<100000 ? 1.5 : 1.1;
  const bsMul  = (t.buys||1)/Math.max(t.sells||1,1) > 2 ? 1.3 : 1;
  return Math.min(Math.round(base*liqMul*bsMul*10)/10, 99.9);
}

function symEmoji(sym){
  const map={PEPE:'🐸',BONK:'🔨',WIF:'🎩',POPCAT:'🐱',MICHI:'🐈',PNUT:'🥜',BRETT:'🧑',MOODENG:'🦛',GOAT:'🐐',DOGE:'🐕',SHIB:'🦊',SPX:'📈',FLOKI:'⚡',MOG:'😸'};
  for(const k in map) if(sym.toUpperCase().includes(k)) return map[k];
  return '🪙';
}

function toast(msg, type){
  const el = document.getElementById('result-toast');
  el.textContent=msg; el.className='show '+type;
  setTimeout(()=>el.classList.remove('show'), 3000);
}

function saveStats(){ localStorage.setItem('fl_stats', JSON.stringify(stats)); }
function savePortfolio(){ localStorage.setItem('fl_portfolio', JSON.stringify(portfolio)); }

// ── Init ───────────────────────────────────
updateStatsRow();
updatePortfolioRow();
// Fix panel display on load
document.getElementById('panel-x').style.display='none';
document.getElementById('panel-ai').style.display='none';
loadTokenQueue();
</script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
