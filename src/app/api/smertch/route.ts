import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>SMERTCH — X100</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:root{--bg:#07090e;--bg1:#0a0c10;--bg2:#0d1118;--bg3:#131a24;--border:#1b2433;--g:#00FF9D;--p:#6C5CE7;--r:#FF4B6E;--y:#F9CA24;--b:#00FF9D;--o:#FF8C00;--txt:#c5cee0;--fg:#c5cee0;--dim:#4a5568}
html{height:100%}body{height:100dvh;height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--txt);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding-top:env(safe-area-inset-top)}


/* ── TOP BAR ── */
.top{display:flex;align-items:center;gap:8px;padding:9px 14px 7px;border-bottom:1px solid var(--border);flex-shrink:0;position:relative;z-index:200}
.logo{font-size:14px;font-weight:800;color:var(--g);letter-spacing:-.3px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--g);box-shadow:0 0 8px var(--g);flex-shrink:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.dot{animation:pulse 2.2s ease-in-out infinite}
.dot.dead{background:var(--r);box-shadow:0 0 8px var(--r);animation:none}
.ticker{font-size:10px;color:var(--dim);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:0 6px}
.kill{padding:3px 8px;border-radius:6px;border:1px solid rgba(255,75,110,.4);color:var(--r);font-size:10px;font-weight:700;background:transparent;cursor:pointer}
.kill.on{background:var(--r);color:#fff}
.tg-status{width:7px;height:7px;border-radius:50%;background:var(--dim);flex-shrink:0;cursor:pointer}
.tg-status.on{background:var(--g);box-shadow:0 0 6px var(--g)}

/* ── CHIPS ── */
.chips{display:flex;gap:5px;padding:7px 12px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;border-bottom:1px solid var(--border)}
.chips::-webkit-scrollbar{display:none}
.chip{white-space:nowrap;padding:5px 10px;border-radius:18px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border);color:var(--dim);background:var(--bg2);transition:all .15s;flex-shrink:0;position:relative}
.chip:active{transform:scale(.94)}
.chip.scan{border-color:rgba(0,255,157,.3);color:var(--g)}
.chip.pump{border-color:rgba(255,140,0,.3);color:var(--o)}
.chip.sig{border-color:rgba(108,92,231,.3);color:var(--p)}
.chip.bag{border-color:rgba(0,180,216,.3);color:var(--b)}
.chip.tg-chip{border-color:rgba(0,180,216,.2);color:var(--b)}
.chip.flt{border-color:rgba(249,202,36,.3);color:var(--y)}
.chip.flt.active-flt::after{content:'';position:absolute;top:3px;right:3px;width:5px;height:5px;border-radius:50%;background:var(--y)}

/* ── FILTER PANEL ── */
.flt-panel{display:none;flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);padding:10px 12px}
.flt-panel.open{display:block}
.flt-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
.flt-label{font-size:10px;color:var(--dim);min-width:60px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.flt-btn{padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border);color:var(--dim);background:var(--bg)}
.flt-btn.on{border-color:var(--y);color:var(--y);background:rgba(249,202,36,.08)}
.flt-reset{font-size:10px;color:var(--r);cursor:pointer;padding:2px 6px;border:1px solid rgba(255,75,110,.25);border-radius:6px;margin-left:auto}

/* ── CHAT ── */
.chat{flex:1;overflow-y:auto;overflow-x:hidden;padding:10px 12px 180px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:var(--border) transparent;-webkit-overflow-scrolling:touch}

/* ── BUBBLES ── */
.msg{display:flex;flex-direction:column;gap:4px;max-width:100%}
.msg.user{align-items:flex-end}
.bbl{padding:9px 12px;border-radius:16px;font-size:13px;line-height:1.5;word-break:break-word}
.bbl.ai{background:var(--bg2);border:1px solid var(--border);border-radius:16px 16px 16px 4px}
.bbl.user{background:rgba(108,92,231,.18);border:1px solid rgba(108,92,231,.28);border-radius:16px 16px 4px 16px;color:#c5bff8}
@keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
.dots span{animation:blink 1.4s infinite both}
.dots span:nth-child(2){animation-delay:.2s}
.dots span:nth-child(3){animation-delay:.4s}

/* ── TOKEN CARD ── */
.tc{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:9px 11px;margin-top:6px}
.tc+.tc{margin-top:5px}
.tc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px}
.sym{font-weight:800;font-size:14px;color:#fff}
.tk-name{font-size:10px;color:var(--dim);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
.price-a{text-align:right}
.price{font-size:12px;font-weight:600;color:#fff}
.chg{font-size:11px;font-weight:700}
.chg.pos{color:var(--g)}.chg.neg{color:var(--r)}.chg.neu{color:var(--dim)}
.stats{display:flex;gap:9px;flex-wrap:wrap;margin-top:4px}
.s{display:flex;flex-direction:column}
.sl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.3px}
.sv{font-size:11px;font-weight:600;color:var(--txt)}
.bdg{display:inline-block;padding:1px 6px;border-radius:5px;font-size:10px;font-weight:700;margin-left:4px}
.b-buy{background:rgba(0,255,157,.12);color:var(--g);border:1px solid rgba(0,255,157,.25)}
.b-sell{background:rgba(255,75,110,.12);color:var(--r);border:1px solid rgba(255,75,110,.25)}
.b-watch{background:rgba(249,202,36,.08);color:var(--y);border:1px solid rgba(249,202,36,.2)}
.b-new{background:rgba(0,180,216,.08);color:var(--b);border:1px solid rgba(0,180,216,.2)}
.b-pump{background:rgba(255,140,0,.1);color:var(--o);border:1px solid rgba(255,140,0,.25)}
.conv{height:2px;background:var(--border);border-radius:2px;margin-top:5px;overflow:hidden}
.conv-f{height:100%;border-radius:2px}
.cbs{display:flex;gap:5px;margin-top:7px}
.cb{padding:4px 9px;border-radius:7px;font-size:10px;font-weight:600;cursor:pointer;border:none}
.cb-g{background:rgba(0,255,157,.13);color:var(--g);border:1px solid rgba(0,255,157,.22)}
.cb-p{background:rgba(108,92,231,.13);color:var(--p);border:1px solid rgba(108,92,231,.22)}
.cb-r{background:rgba(255,75,110,.1);color:var(--r);border:1px solid rgba(255,75,110,.18)}
.cb-o{background:rgba(255,140,0,.1);color:var(--o);border:1px solid rgba(255,140,0,.2)}

/* bonding curve bar */
.bond-bar{height:4px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:5px}
.bond-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--o),var(--y))}

/* ── HOLDERS ── */
.holder-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)}
.holder-row:last-child{border:none}
.holder-addr{font-size:10px;color:var(--dim);font-family:monospace}
.holder-pct{font-size:11px;font-weight:700}
.dev-flag{font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,75,110,.15);color:var(--r);border:1px solid rgba(255,75,110,.25);margin-left:4px}

/* ── PORTFOLIO ── */
.prow{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:8px 11px;margin-top:5px;display:flex;justify-content:space-between;align-items:center}
.pnl-p{color:var(--g);font-weight:700}
.pnl-n{color:var(--r);font-weight:700}

/* rug */
.rug-bar{height:4px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:4px}
.rug-f{height:100%;border-radius:3px}

/* ── INPUT ── */
.input-wrap{flex-shrink:0;background:var(--bg);border-top:1px solid var(--border);padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom))}
.input-row{display:flex;gap:7px;align-items:flex-end}
.inp{flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:9px 13px;color:#fff;font-size:14px;outline:none;resize:none;font-family:inherit;line-height:1.4;max-height:110px}
.inp:focus{border-color:var(--p)}
.inp::placeholder{color:var(--dim)}
.send{background:var(--p);color:#fff;border:none;border-radius:11px;padding:9px 15px;font-size:17px;cursor:pointer;flex-shrink:0}
.send:active{opacity:.7}

/* misc */
@keyframes spin{to{transform:rotate(360deg)}}
.spin{display:inline-block;width:11px;height:11px;border:2px solid var(--border);border-top-color:var(--g);border-radius:50%;animation:spin .65s linear infinite;vertical-align:middle;margin-right:4px}
.sec-lbl{font-size:10px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}

/* ── BOTTOM TAB BAR ── */
.tab-bar{flex-shrink:0;height:54px;background:var(--bg1);border-top:1px solid var(--border);display:flex;align-items:stretch;padding-bottom:env(safe-area-inset-bottom)}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;color:var(--dim);font-size:9px;font-weight:700;letter-spacing:.5px;transition:color .15s;padding:4px 0}
.tab.active{color:var(--b)}
.tab .tab-ico{font-size:20px;line-height:1}

/* ── MARKET PANEL ── */
#marketPanel{display:none;flex-direction:column;flex:1;min-height:0;overflow:hidden;-webkit-overflow-scrolling:touch;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
#marketPanel.active{display:flex}
.mkt-search{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px 12px;color:var(--fg);font-size:13px;width:100%;box-sizing:border-box;margin:8px 0}
.mkt-search::placeholder{color:var(--dim)}
.mkt-list{overflow-y:auto;flex:1}
.mkt-row{display:flex;align-items:center;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;gap:10px;transition:background .1s}
.mkt-row:active{background:var(--bg2)}
.mkt-rank{font-size:10px;color:var(--dim);width:22px;flex-shrink:0;text-align:right}
.mkt-icon{width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover;background:var(--bg3)}
.mkt-info{flex:1;min-width:0}
.mkt-sym{font-size:13px;font-weight:700;color:var(--fg)}
.mkt-name{font-size:11px;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mkt-right{text-align:right;flex-shrink:0}
.mkt-price{font-size:13px;font-weight:600;color:var(--fg)}
.mkt-chg{font-size:11px;font-weight:700}
.mkt-chg.up{color:#00FF9D}.mkt-chg.dn{color:#ff4d6d}
.mkt-mcap{font-size:10px;color:var(--dim)}
.mkt-cat{display:flex;gap:6px;overflow-x:auto;padding:4px 0;scrollbar-width:none}
.mkt-cat::-webkit-scrollbar{display:none}
.mkt-cat-btn{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--dim);cursor:pointer;white-space:nowrap;flex-shrink:0}
.mkt-cat-btn.active{background:rgba(0,255,157,.15);border-color:var(--b);color:var(--b)}

/* ── WALLET PANEL ── */
#walletPanel{display:none;flex-direction:column;flex:1;min-height:0;overflow-y:auto;padding:0 4px;-webkit-overflow-scrolling:touch;flex:1}
#walletPanel.active{display:flex}
.wallet-connect-btn{background:rgba(108,92,231,.2);border:2px solid #6C5CE7;border-radius:14px;padding:14px;text-align:center;cursor:pointer;margin:16px 0;font-weight:700;font-size:14px;color:#a79cf7;transition:all .2s}
.wallet-connect-btn:active{background:rgba(108,92,231,.4)}
.wallet-addr{font-size:11px;color:var(--dim);text-align:center;margin-bottom:12px;font-family:monospace}
.wallet-bal{display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.wallet-bal-label{font-size:11px;color:var(--dim)}
.wallet-bal-val{font-size:16px;font-weight:700;color:var(--fg)}
.wallet-bal-usd{font-size:11px;color:var(--dim)}
.tok-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border-radius:12px;margin-bottom:6px}
.tok-ico{width:32px;height:32px;border-radius:50%;background:var(--bg3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px}
.tok-info{flex:1}
.qk-row{display:flex;align-items:center;gap:6px;padding:6px 0;flex-wrap:wrap}
.qk-btn{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:3px 10px;font-size:11px;font-weight:700;color:var(--dim);cursor:pointer}
.qk-btn.active{background:rgba(0,255,157,.12);border-color:var(--b);color:var(--b)}
.tok-sym{font-size:13px;font-weight:700;color:var(--fg)}
.tok-amt{font-size:11px;color:var(--dim)}
.tok-val{text-align:right;font-size:13px;font-weight:600;color:var(--fg)}

/* ── SWAP TERMINAL ── */
.swap-box{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:12px}
.swap-title{font-size:11px;font-weight:700;color:var(--dim);letter-spacing:.5px;margin-bottom:10px;text-transform:uppercase}
.swap-row{display:flex;gap:8px;margin-bottom:8px}
.swap-inp{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:8px 10px;color:var(--fg);font-size:14px;font-weight:600}
.swap-inp::placeholder{color:var(--dim);font-weight:400}
.swap-sel{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:8px 10px;color:var(--fg);font-size:13px;font-weight:600;cursor:pointer;min-width:80px}
.swap-btn{width:100%;background:var(--b);color:#000;font-weight:800;font-size:14px;letter-spacing:.5px;border:none;border-radius:12px;padding:13px;cursor:pointer;transition:opacity .15s}
.swap-btn:disabled{opacity:.4;cursor:not-allowed}
.swap-quote{font-size:11px;color:var(--dim);text-align:center;min-height:16px;margin-bottom:8px}
.swap-tabs{display:flex;gap:6px;margin-bottom:10px}
.swap-tab{flex:1;padding:7px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;background:var(--bg3);color:var(--dim);border:1px solid var(--border)}
.swap-tab.active{background:rgba(0,255,157,.15);border-color:var(--b);color:var(--b)}


.agent-mode-bar{flex-shrink:0;background:var(--bg);border-top:1px solid var(--border);padding:6px 12px;display:flex;align-items:center;gap:8px;font-size:11px}
</style>
</head>
<body>

<!-- TOP BAR -->
<div class="top">
  <div class="dot" id="dot"></div>
  <span class="logo">SMERTCH ⚡</span>
  <span class="ticker" id="tkr"></span>
  <div class="tg-status" id="tgDot" title="Telegram push" onclick="cmd('tg setup')"></div>
  <button class="kill" id="killBtn" onclick="toggleKill()">☠</button>
</div>

<!-- CHIPS -->
<div class="chips">
  <div class="chip scan" onclick="cmd('\u0441\u043a\u0430\u043d')">🌪️ \u0421\u043a\u0430\u043d</div>
  <div class="chip pump" onclick="cmd('pump')">🔥 PUMP.FUN</div>
  <div class="chip sig"  onclick="cmd('\u0441\u0438\u0433\u043d\u0430\u043b\u044b')">⚡ \u0421\u0438\u0433\u043d\u0430\u043b\u044b</div>
  <div class="chip bag"  onclick="cmd('\u0431\u0430\u0433')">💼 \u0411\u0430\u0433</div>
  <div class="chip tg-chip" onclick="cmd('\u0433\u043e\u0440\u044f\u0447\u0438\u0435')">🔥 \u0413\u043e\u0440\u044f\u0447\u0438\u0435</div>
  <div class="chip flt" id="fltChip" onclick="toggleFilters()">⚙️ \u0424\u0438\u043b\u044c\u0442\u0440\u044b</div>
  <div class="chip" onclick="cmd('\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044f')">🧠 AI</div>
</div>

<!-- FILTER PANEL -->
<div class="flt-panel" id="fltPanel">
  <div class="flt-row">
    <span class="flt-label">MCap</span>
    <div class="flt-btn on" onclick="setF('mcap',0,this)">\u041b\u044e\u0431\u043e\u0439</div>
    <div class="flt-btn" onclick="setF('mcap',50000,this)">&lt;50K</div>
    <div class="flt-btn" onclick="setF('mcap',200000,this)">&lt;200K</div>
    <div class="flt-btn" onclick="setF('mcap',500000,this)">&lt;500K</div>
    <div class="flt-btn" onclick="setF('mcap',1000000,this)">&lt;1M</div>
    <div class="flt-reset" onclick="resetFilters()">\u0421\u0431\u0440\u043e\u0441</div>
  </div>
  <div class="flt-row">
    <span class="flt-label">\u041b\u0438\u043a\u0432.</span>
    <div class="flt-btn on" onclick="setF('liq',0,this)">\u041b\u044e\u0431\u0430\u044f</div>
    <div class="flt-btn" onclick="setF('liq',5000,this)">&gt;5K</div>
    <div class="flt-btn" onclick="setF('liq',20000,this)">&gt;20K</div>
    <div class="flt-btn" onclick="setF('liq',50000,this)">&gt;50K</div>
  </div>
  <div class="flt-row">
    <span class="flt-label">\u0412\u043e\u0437\u0440\u0430\u0441\u0442</span>
    <div class="flt-btn on" onclick="setF('age',0,this)">\u041b\u044e\u0431\u043e\u0439</div>
    <div class="flt-btn" onclick="setF('age',30,this)">&lt;30m</div>
    <div class="flt-btn" onclick="setF('age',120,this)">&lt;2h</div>
    <div class="flt-btn" onclick="setF('age',360,this)">&lt;6h</div>
    <div class="flt-btn" onclick="setF('sig','buy',this)">🟢 BUY only</div>
  </div>
</div>

<!-- CHAT -->
<div class="chat" id="chat"></div>

<!-- INPUT -->
<div class="input-wrap">
  <div class="input-row">
    <textarea class="inp" id="inp" rows="1" placeholder="\u0422\u043e\u043a\u0435\u043d / \u0430\u0434\u0440\u0435\u0441 / \u0432\u043e\u043f\u0440\u043e\u0441…"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send()}"
      oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,110)+'px'"></textarea>
    <button class="mic" id="micBtn" onclick="toggleVoice()" title="\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0432\u0432\u043e\u0434">🎙</button>
    <button class="agent-toggle" id="agentToggle" onclick="toggleAgentMode()">🤖</button>
    <button class="send" onclick="send()">↑</button>
  </div>
  <div id="agentModeBar" class="agent-mode-bar">⚡ OASIS COUNCIL — \u0430\u043d\u0430\u043b\u0438\u0437 \u0447\u0435\u0440\u0435\u0437 \u0430\u0433\u0435\u043d\u0442\u043e\u0432</div>
</div>

<script>

// Strip raw tool-call artifacts from agent output before rendering
function stripFuncTags(txt) {
  if(!txt) return '';
  // Remove <function=name>{...}</function> blocks (multi-line)
  txt = txt.replace(/<function=[^>]*>[\\s\\S]*?<\\/function>/gi, '');
  // Remove leftover <function=...> open tags (unclosed)
  txt = txt.replace(/<function=[^>]*>/gi, '');
  // Remove </function> close tags
  txt = txt.replace(/<\\/function>/gi, '');
  // Trim leading/trailing whitespace after removal
  return txt.trim();
}

const DEX = 'https://api.dexscreener.com';
const PUMP = '/api/pump';
const SOL_RPC = 'https://api.mainnet-beta.solana.com';
let killed=false, scanCache=[], pumpCache=[], pushed=new Set(JSON.parse(localStorage.getItem('gl_pushed')||'[]'));
let portfolio=JSON.parse(localStorage.getItem('gl_portfolio')||'[]');
let tgPushTimer=null;
let flt={mcap:0, liq:0, age:0, sig:'all'};

// ── UTILS ───────────────────────────────────────────────────────────────────
const f$=v=>{if(!v||isNaN(v))return'–';if(v>=1e9)return'$'+(v/1e9).toFixed(2)+'B';if(v>=1e6)return'$'+(v/1e6).toFixed(2)+'M';if(v>=1e3)return'$'+(v/1e3).toFixed(1)+'K';return v>=0.01?'$'+v.toFixed(4):'$'+v.toExponential(2)};
const fAge=ms=>{const m=Math.floor(ms/60000);return m<60?m+'m':m<1440?Math.floor(m/60)+'h':Math.floor(m/1440)+'d'};
const clr=v=>v>0?'pos':v<0?'neg':'neu';
const cs=v=>v>0?'+'+v.toFixed(1)+'%':v.toFixed(1)+'%';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const scroll=()=>{const c=document.getElementById('chat');requestAnimationFrame(()=>c.scrollTop=c.scrollHeight)};

// ── FILTERS ─────────────────────────────────────────────────────────────────
function toggleFilters(){
  const p=document.getElementById('fltPanel'), c=document.getElementById('fltChip');
  const open=p.classList.toggle('open');
  c.classList.toggle('on',open);
}
function setF(key,val,el){
  flt[key]=val;
  el.closest('.flt-row').querySelectorAll('.flt-btn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  const active=flt.mcap||flt.liq||flt.age||flt.sig!=='all';
  document.getElementById('fltChip').classList.toggle('active-flt',active);
}
function resetFilters(){
  flt={mcap:0,liq:0,age:0,sig:'all'};
  document.querySelectorAll('.flt-row .flt-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.flt-row .flt-btn:first-of-type').forEach(b=>b.classList.add('on'));
  document.getElementById('fltChip').classList.remove('active-flt');
}
function applyFilters(pairs){
  return pairs.filter(p=>{
    const mcap=p.fdv||p.marketCap||0;
    const liq=p.liquidity?.usd||0;
    const age=p.pairCreatedAt?Math.floor((Date.now()-p.pairCreatedAt)/60000):9999;
    const sig=sigType(score(p));
    if(flt.mcap>0 && mcap>flt.mcap) return false;
    if(flt.liq>0 && liq<flt.liq) return false;
    if(flt.age>0 && age>flt.age) return false;
    if(flt.sig==='buy' && sig!=='buy') return false;
    return true;
  });
}

// ── KILL ─────────────────────────────────────────────────────────────────────
function toggleKill(){
  killed=!killed;
  const b=document.getElementById('killBtn'),d=document.getElementById('dot');
  b.classList.toggle('on',killed); b.textContent=killed?'☠ KILLED':'☠';
  d.classList.toggle('dead',killed);
  if(killed){clearInterval(tgPushTimer);botMsg('☠️ Kill Switch — \u0432\u0441\u0451 \u043e\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e.');}
  else{startAutoLoops();botMsg('✅ \u0412\u043e\u0437\u043e\u0431\u043d\u043e\u0432\u043b\u044f\u044e.');}
}

// ── SIGNAL ENGINE ─────────────────────────────────────────────────────────────
function score(p){
  const c5=parseFloat(p.priceChange?.m5||0),c1=parseFloat(p.priceChange?.h1||0);
  const vol=p.volume?.h24||0,mcap=p.fdv||p.marketCap||0,liq=p.liquidity?.usd||0;
  const age=p.pairCreatedAt?Date.now()-p.pairCreatedAt:null;
  const buys=p.txns?.h24?.buys||0,sells=p.txns?.h24?.sells||0;
  let s=50;
  if(c5>5)s+=12;if(c5<-5)s-=18;if(c1>20)s+=18;if(c1<-20)s-=22;
  if(mcap>0){const r=vol/mcap;if(r>0.5)s+=14;if(r<0.05)s-=10;}
  if(liq<5000)s-=24;else if(liq>50000)s+=8;
  if(age&&age<2*3600000&&c5>0)s+=12;
  if(buys>sells*1.5)s+=10;if(sells>buys*2)s-=15;
  if(mcap>0&&mcap<500000)s+=12;if(mcap>5000000)s-=8;
  return Math.max(0,Math.min(100,Math.round(s)));
}
function sigType(s){return s>=68?'buy':s<=32?'sell':'watch';}

// ── CHAT HELPERS ─────────────────────────────────────────────────────────────
function botMsg(html){
  const chat=document.getElementById('chat');
  const d=document.createElement('div');d.className='msg';
  d.innerHTML=\`<div class="bbl ai">\${html}</div>\`;
  chat.appendChild(d);scroll();return d;
}
function userBubble(txt){
  const chat=document.getElementById('chat');
  const d=document.createElement('div');d.className='msg user';
  d.innerHTML=\`<div class="bbl user">\${esc(txt)}</div>\`;
  chat.appendChild(d);scroll();
}
function typing(){
  const chat=document.getElementById('chat');
  const d=document.createElement('div');d.className='msg';d.id='typing';
  d.innerHTML=\`<div class="bbl ai"><div class="dots"><span>●</span><span>●</span><span>●</span></div></div>\`;
  chat.appendChild(d);scroll();return d;
}
function rmTyping(){const t=document.getElementById('typing');if(t)t.remove();}

// ── TOKEN CARD ────────────────────────────────────────────────────────────────
function tokenCard(p,opts={}){
  const sym=p.baseToken?.symbol||'?',name=p.baseToken?.name||'';
  const price=parseFloat(p.priceUsd||0);
  const c5=parseFloat(p.priceChange?.m5||0),c1=parseFloat(p.priceChange?.h1||0),c6=parseFloat(p.priceChange?.h6||0);
  const vol1=p.volume?.h1||0,vol24=p.volume?.h24||0,mcap=p.fdv||p.marketCap||0,liq=p.liquidity?.usd||0;
  const buys=p.txns?.h24?.buys||0,sells=p.txns?.h24?.sells||0;
  const age=p.pairCreatedAt?Date.now()-p.pairCreatedAt:null;
  const conv=score(p),st=sigType(conv);
  const isNew=age&&age<4*3600000;
  const addr=p.baseToken?.address||'';
  const dexUrl=p.url||'https://dexscreener.com/solana/'+(p.pairAddress||'');
  const bp=buys+sells>0?Math.round(buys/(buys+sells)*100):50;
  const sigClr=st==='buy'?'var(--g)':st==='sell'?'var(--r)':'var(--y)';
  return \`<div class="tc">
    <div class="tc-head">
      <div><div class="sym">\${esc(sym)} <span class="bdg b-\${st}">\${st==='buy'?'🟢 BUY':st==='sell'?'🔴 EXIT':'🟡 WATCH'}</span>\${isNew?'<span class="bdg b-new">NEW</span>':''}</div>
      <div class="tk-name">\${esc(name)}</div></div>
      <div class="price-a"><div class="price">\${f$(price)}</div><div class="chg \${clr(c1)}">\${cs(c1)} 1h</div></div>
    </div>
    <div class="stats">
      <div class="s"><div class="sl">MCap</div><div class="sv">\${f$(mcap)}</div></div>
      <div class="s"><div class="sl">Vol 1h</div><div class="sv">\${f$(vol1)}</div></div>
      <div class="s"><div class="sl">\u041b\u0438\u043a\u0432.</div><div class="sv">\${f$(liq)}</div></div>
      <div class="s"><div class="sl">B/S</div><div class="sv" style="color:\${bp>55?'var(--g)':'var(--r)'}">\${buys}/\${sells}</div></div>
      \${age?\`<div class="s"><div class="sl">\u0412\u043e\u0437\u0440\u0430\u0441\u0442</div><div class="sv">\${fAge(age)}</div></div>\`:''}
      <div class="s"><div class="sl">5m</div><div class="sv chg \${clr(c5)}">\${cs(c5)}</div></div>
    </div>
    <div class="conv"><div class="conv-f" style="width:\${conv}%;background:\${sigClr}"></div></div>
    <div class="cbs">
      <button class="cb cb-g" onclick="quickBuyNow('\${esc(addr)}','\${esc(sym)}')">⚡ \u041a\u0443\u043f\u0438\u0442\u044c</button>
      <button class="cb cb-p" onclick="cmd('\u0430\u043d\u0430\u043b\u0438\u0437 \${esc(addr)}')">\u0410\u043d\u0430\u043b\u0438\u0437</button>
      \${opts.pushTg?\`<button class="cb cb-o" onclick="pushOneTg('\${esc(sym)}','\${esc(addr)}',\${c1},\${vol1},\${liq},\${buys},\${sells},\${age||0})">📤 TG</button>\`:''}
      <a href="\${dexUrl}" target="_blank" style="text-decoration:none"><button class="cb cb-p">DEX ↗</button></a>
      \${opts.closeBtn!==undefined?\`<button class="cb cb-r" onclick="closePos(\${opts.closeBtn})">\u0417\u0430\u043a\u0440\u044b\u0442\u044c</button>\`:''}
    </div>
  </div>\`;
}

// ── PUMP.FUN CARD ─────────────────────────────────────────────────────────────
async function pumpCard(coin){
  const sym=esc(coin.symbol||'?'), name=esc(coin.name||'');
  const mcap=coin.usd_market_cap||0;
  const addr=coin.mint||'';
  const ageMs=Date.now()-coin.created_timestamp;
  const progress=Math.min(100,Math.round((mcap/69000)*100)); // ~$69K graduation
  const url='https://pump.fun/'+addr;
  return \`<div class="tc" style="border-color:rgba(255,140,0,.2)">
    <div class="tc-head">
      <div><div class="sym">\${sym} <span class="bdg b-pump">🔥 PUMP</span></div>
      <div class="tk-name">\${name}</div></div>
      <div class="price-a"><div style="font-size:11px;color:var(--o)">\${f$(mcap)}</div><div style="font-size:10px;color:var(--dim)">\${fAge(ageMs)} \u043d\u0430\u0437\u0430\u0434</div></div>
    </div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:3px">Bonding curve: \${progress}% \u0434\u043e \u043b\u0438\u0441\u0442\u0438\u043d\u0433\u0430</div>
    <div class="bond-bar"><div class="bond-fill" style="width:\${progress}%"></div></div>
    <div class="cbs">
      <button class="cb cb-g" onclick="quickEnter('\${addr}','\${sym}')">+\u0412\u043e\u0439\u0442\u0438</button>
      <button class="cb cb-p" onclick="cmd('\u0430\u043d\u0430\u043b\u0438\u0437 \${addr}')">\u0410\u043d\u0430\u043b\u0438\u0437</button>
      <a href="\${url}" target="_blank" style="text-decoration:none"><button class="cb cb-o">pump.fun ↗</button></a>
    </div>
  </div>\`;
}

// ── SCAN ─────────────────────────────────────────────────────────────────────
async function runScan(){
  if(killed) return;
  const t=typing();
  try{
    const [boost,prof]=await Promise.all([
      fetch(DEX+'/token-boosts/latest/v1').then(r=>r.json()).catch(()=>[]),
      fetch(DEX+'/token-profiles/latest/v1').then(r=>r.json()).catch(()=>[]),
    ]);
    const search=await fetch(DEX+'/latest/dex/search?q=solana&rankBy=trendingScoreH6&order=desc').then(r=>r.json()).catch(()=>({pairs:[]}));
    const boosts=(Array.isArray(boost)?boost:[]).filter(b=>b.chainId==='solana').slice(0,10);
    const profiles=(Array.isArray(prof)?prof:[]).filter(b=>b.chainId==='solana').slice(0,8);
    const addrs=[...new Set([...boosts.map(b=>b.tokenAddress),...profiles.map(p=>p.tokenAddress)])].slice(0,14);
    let pairs=[];
    if(addrs.length){const r=await fetch(DEX+'/latest/dex/tokens/'+addrs.join(',')).then(x=>x.json());pairs=(r.pairs||[]).filter(p=>p.chainId==='solana');}
    const sp=(search.pairs||[]).filter(p=>p.chainId==='solana').slice(0,8);
    const seen=new Set();
    let all=[...pairs,...sp].filter(p=>{const a=p.baseToken?.address;if(!a||seen.has(a))return false;seen.add(a);return true;});
    all.sort((a,b)=>score(b)-score(a));
    scanCache=all;
    const filtered=applyFilters(all);
    rmTyping();
    if(!filtered.length){botMsg(\`🌪️ \u0421\u043a\u0430\u043d: <b>\${all.length}</b> \u0442\u043e\u043a\u0435\u043d\u043e\u0432, \u043d\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u044b \u0441\u043a\u0440\u044b\u0432\u0430\u044e\u0442 \u0432\u0441\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b. \u0421\u0431\u0440\u043e\u0441 \u0444\u0438\u043b\u044c\u0442\u0440\u043e\u0432?\`);return;}
    document.getElementById('tkr').textContent=all.slice(0,5).map(p=>\`\${p.baseToken?.symbol} \${parseFloat(p.priceChange?.h1||0)>0?'▲':'▼'}\${Math.abs(parseFloat(p.priceChange?.h1||0)).toFixed(0)}%\`).join(' · ');
    const d=document.createElement('div');d.className='msg';
    const top=filtered.slice(0,5);
    d.innerHTML=\`<div class="bbl ai">🌪️ <b>\u0421\u043a\u0430\u043d \${new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</b> — \${filtered.length}/\${all.length} \u0442\u043e\u043a\u0435\u043d\u043e\u0432\${flt.mcap||flt.liq||flt.age||flt.sig!=='all'?' <span style="color:var(--y);font-size:11px">⚙ \u0444\u0438\u043b\u044c\u0442\u0440 \u0430\u043a\u0442\u0438\u0432\u0435\u043d</span>':''}<br>\${top.map(p=>tokenCard(p,{pushTg:true})).join('')}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
    // Auto-push BUY signals to TG
    const buySigs=filtered.filter(p=>sigType(score(p))==='buy'&&!pushed.has(p.baseToken?.address||''));
    if(buySigs.length) autoTgPush(buySigs);
  }catch(e){rmTyping();botMsg('⚠️ \u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043a\u0430\u043d\u0430: '+esc(e.message));}
}

// ── PUMP.FUN ─────────────────────────────────────────────────────────────────
async function runPump(){
  if(killed) return;
  const t=typing();
  try{
    const now=Date.now();
    const r=await fetch(PUMP+'/coins?offset=0&limit=50&sort=created_timestamp&order=DESC&includeNsfw=false').then(x=>x.json());
    rmTyping();
    if(!r||!Array.isArray(r)){botMsg('⚠️ pump.fun API \u043d\u0435 \u043e\u0442\u0432\u0435\u0442\u0438\u043b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0447\u0435\u0440\u0435\u0437 VPN \u0438\u043b\u0438 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439 DEX \u0441\u043a\u0430\u043d.');return;}
    const fresh=r.filter(c=>c.created_timestamp&&(now-c.created_timestamp)<10*60000&&!c.complete);
    pumpCache=fresh;
    if(!fresh.length){botMsg('🔥 <b>pump.fun</b>: \u043d\u0435\u0442 \u043d\u043e\u0432\u044b\u0445 \u0442\u043e\u043a\u0435\u043d\u043e\u0432 \u0437\u0430 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 10 \u043c\u0438\u043d\u0443\u0442.');return;}
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">🔥 <b>pump.fun — \u043d\u043e\u0432\u044b\u0435 \u0437\u0430\u043f\u0443\u0441\u043a\u0438 &lt;10 \u043c\u0438\u043d</b> (\${fresh.length} \u0442\u043e\u043a\u0435\u043d\u043e\u0432)\${fresh.slice(0,6).map(c=>pumpCard(c)).join('')}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
  }catch(e){
    rmTyping();
    botMsg('⚠️ pump.fun: CORS \u0438\u043b\u0438 API \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d. <br><span style="font-size:11px;color:var(--dim)">\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0447\u0435\u0440\u0435\u0437 <a href="https://pump.fun" target="_blank" style="color:var(--o)">pump.fun ↗</a> \u043d\u0430\u043f\u0440\u044f\u043c\u0443\u044e</span>');
  }
}

// ── SIGNALS ─────────────────────────────────────────────────────────────────
async function runSignals(){
  if(!scanCache.length){await runScan();return;}
  const filtered=applyFilters(scanCache);
  const buys=filtered.filter(p=>sigType(score(p))==='buy').slice(0,4);
  const sells=filtered.filter(p=>sigType(score(p))==='sell').slice(0,2);
  if(!buys.length&&!sells.length){botMsg('\u041d\u0435\u0442 \u0447\u0451\u0442\u043a\u0438\u0445 \u0441\u0438\u0433\u043d\u0430\u043b\u043e\u0432. \u041d\u0430\u0436\u043c\u0438 🌪️ \u0421\u043a\u0430\u043d \u0434\u043b\u044f \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f.');return;}
  const d=document.createElement('div');d.className='msg';
  let html='';
  if(buys.length) html+=\`<div class="sec-lbl" style="color:var(--g)">🟢 \u041f\u041e\u041a\u0423\u041f\u0410\u0419 \u0421\u0415\u0419\u0427\u0410\u0421</div>\${buys.map(p=>tokenCard(p,{pushTg:true})).join('')}\`;
  if(sells.length) html+=\`<div class="sec-lbl" style="color:var(--r);margin-top:8px">🔴 \u0424\u0418\u041a\u0421\u0418\u0420\u0423\u0419</div>\${sells.map(p=>tokenCard(p)).join('')}\`;
  d.innerHTML=\`<div class="bbl ai">⚡ <b>\u0421\u0438\u0433\u043d\u0430\u043b\u044b</b>\${html}</div>\`;
  document.getElementById('chat').appendChild(d);scroll();
}

// ── HOT ─────────────────────────────────────────────────────────────────────
async function runHot(){
  const t=typing();
  try{
    const r=await fetch(DEX+'/token-boosts/latest/v1').then(x=>x.json());
    const boosts=(Array.isArray(r)?r:[]).filter(b=>b.chainId==='solana').slice(0,8);
    const addrs=boosts.map(b=>b.tokenAddress).join(',');
    const r2=await fetch(DEX+'/latest/dex/tokens/'+addrs).then(x=>x.json());
    const pairs=(r2.pairs||[]).filter(p=>p.chainId==='solana');
    rmTyping();
    if(!pairs.length){botMsg('\u041d\u0435\u0442 \u0433\u043e\u0440\u044f\u0447\u0438\u0445 \u0442\u043e\u043a\u0435\u043d\u043e\u0432');return;}
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">🔥 <b>\u0413\u043e\u0440\u044f\u0447\u0438\u0435</b> (\u0431\u0443\u0441\u0442 + \u0442\u0440\u0435\u043d\u0434)\${pairs.slice(0,5).map(p=>tokenCard(p,{pushTg:true})).join('')}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
  }catch(e){rmTyping();botMsg('⚠️ '+esc(e.message));}
}

// ── PORTFOLIO ────────────────────────────────────────────────────────────────
async function runBag(){
  if(!portfolio.length){botMsg('💼 \u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c \u043f\u0443\u0441\u0442. \u041d\u0430\u0436\u043c\u0438 <b>+\u0412\u043e\u0439\u0442\u0438</b> \u043d\u0430 \u0442\u043e\u043a\u0435\u043d\u0435.');return;}
  const t=typing();
  try{
    const addrs=[...new Set(portfolio.map(p=>p.addr))].filter(Boolean);
    let pm={};
    if(addrs.length){const r=await fetch(DEX+'/latest/dex/tokens/'+addrs.join(',')).then(x=>x.json());for(const p of (r.pairs||[])){const a=p.baseToken?.address;if(a)pm[a]={price:parseFloat(p.priceUsd||0),sym:p.baseToken?.symbol||'?'};}}
    rmTyping();
    let tot=0,cnt=0;
    const rows=portfolio.map((pos,i)=>{
      const cur=pm[pos.addr]?.price||0;
      const sym=pm[pos.addr]?.sym||pos.sym||pos.addr?.slice(0,6)||'?';
      const pnl=pos.entry>0?(cur-pos.entry)/pos.entry*100:0;
      tot+=pnl;cnt++;
      return \`<div class="prow"><div><b>\${esc(sym)}</b><br><span style="font-size:10px;color:var(--dim)">\u0412\u0445\u043e\u0434: \${pos.entry>0?f$(pos.entry):'?'} · \${pos.sol||0} SOL · \${fAge(Date.now()-pos.ts)}</span></div>
      <div style="text-align:right"><div class="\${pnl>=0?'pnl-p':'pnl-n'}">\${pnl>=0?'+':''}\${pnl.toFixed(1)}%</div>
      <div style="font-size:10px;color:var(--dim)">\${cur>0?f$(cur):'–'}</div>
      <button class="cb cb-r" style="font-size:9px;margin-top:3px" onclick="closePos(\${i})">\u0417\u0430\u043a\u0440\u044b\u0442\u044c</button></div></div>\`;
    }).join('');
    const avg=cnt?tot/cnt:0;
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">💼 <b>\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c</b> · avg <span class="\${avg>=0?'pnl-p':'pnl-n'}">\${avg>=0?'+':''}\${avg.toFixed(1)}%</span>\${rows}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
  }catch(e){rmTyping();botMsg('⚠️ '+esc(e.message));}
}

async function quickEnter(addr,sym){
  portfolio.push({id:Date.now(),addr,sym,entry:0,sol:0,ts:Date.now()});
  localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));
  botMsg(\`✅ <b>\${esc(sym)}</b> \u0432 \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u0435. \u0412\u0432\u0435\u0434\u0438: <i>\u0432\u0445\u043e\u0434 \${esc(sym)} 0.000001 0.5</i> — \u0434\u043b\u044f \u0446\u0435\u043d\u044b \u0432\u0445\u043e\u0434\u0430 \u0438 \u0440\u0430\u0437\u043c\u0435\u0440\u0430\`);
}
async function closePos(i){
  const sym=portfolio[i]?.sym||'\u0442\u043e\u043a\u0435\u043d';
  portfolio.splice(i,1);
  localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));
  botMsg(\`❌ \u041f\u043e\u0437\u0438\u0446\u0438\u044f <b>\${esc(sym)}</b> \u0437\u0430\u043a\u0440\u044b\u0442\u0430\`);
}
// ── QUICK BUY / SELL ───────────────────────────────────────────────────────────
let qkSol = 0.1; // preset SOL amount for quick buy

function setQkSol(amt, el) {
  qkSol = amt;
  document.querySelectorAll('.qk-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function quickBuyNow(mint, sym) {
  if(!phantomPubkey) { await connectPhantom(); if(!phantomPubkey) return; }
  botMsg(\`⚡ \u041f\u043e\u043a\u0443\u043f\u043a\u0430 <b>\${esc(sym)}</b> \u0437\u0430 \${qkSol} SOL…\`);
  try {
    const lamports = Math.round(qkSol * 1e9);
    const q = await fetch(\`https://quote-api.jup.ag/v6/quote?inputMint=\${WSOL_MINT}&outputMint=\${mint}&amount=\${lamports}&slippageBps=300\`)
      .then(r => { if(!r.ok) throw new Error('Jupiter quote ' + r.status); return r.json(); });
    if(q.error) throw new Error(q.error);
    const swapR = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ quoteResponse:q, userPublicKey:phantomPubkey, wrapAndUnwrapSol:true, dynamicComputeUnitLimit:true, prioritizationFeeLamports:'auto' })
    });
    if(!swapR.ok) throw new Error('Jupiter swap ' + swapR.status);
    const { swapTransaction } = await swapR.json();
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
    botMsg('✍️ \u041f\u043e\u0434\u043f\u0438\u0448\u0438 \u0432 Phantom…');
    const phantom = window.solana || window.phantom?.solana;
    const { signature } = await phantom.signAndSendTransaction({ serialize: () => txBuf });
    const outAmt = (parseInt(q.outAmount) / 1e6).toLocaleString('en-US', {maximumFractionDigits:2});
    botMsg(\`✅ <b>\u041a\u0443\u043f\u043b\u0435\u043d\u043e \${esc(sym)}</b> × \${outAmt}<br><a href="https://solscan.io/tx/\${signature}" target="_blank" style="color:var(--b)">\${signature.slice(0,16)}…</a>\`);
    portfolio.push({id:Date.now(),addr:mint,sym,entry:qkSol,sol:qkSol,ts:Date.now()});
    localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));
    setTimeout(refreshWallet, 5000);
  } catch(e) { botMsg('⚠️ ' + e.message); }
}

async function quickSellNow(mint, sym, amt, dec) {
  if(!phantomPubkey) { await connectPhantom(); if(!phantomPubkey) return; }
  botMsg(\`⚡ \u041f\u0440\u043e\u0434\u0430\u0436\u0430 <b>\${esc(sym)}</b>…\`);
  try {
    const lamports = Math.round(amt * Math.pow(10, dec||6));
    const q = await fetch(\`https://quote-api.jup.ag/v6/quote?inputMint=\${mint}&outputMint=\${WSOL_MINT}&amount=\${lamports}&slippageBps=300\`)
      .then(r => { if(!r.ok) throw new Error('Jupiter quote ' + r.status); return r.json(); });
    if(q.error) throw new Error(q.error);
    const swapR = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ quoteResponse:q, userPublicKey:phantomPubkey, wrapAndUnwrapSol:true, dynamicComputeUnitLimit:true, prioritizationFeeLamports:'auto' })
    });
    if(!swapR.ok) throw new Error('Jupiter swap ' + swapR.status);
    const { swapTransaction } = await swapR.json();
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
    botMsg('✍️ \u041f\u043e\u0434\u043f\u0438\u0448\u0438 \u043f\u0440\u043e\u0434\u0430\u0436\u0443 \u0432 Phantom…');
    const phantom = window.solana || window.phantom?.solana;
    const { signature } = await phantom.signAndSendTransaction({ serialize: () => txBuf });
    const solReceived = (parseInt(q.outAmount) / 1e9).toFixed(4);
    botMsg(\`✅ <b>\u041f\u0440\u043e\u0434\u0430\u043d\u043e \${esc(sym)}</b>, \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u043e ~\${solReceived} SOL<br><a href="https://solscan.io/tx/\${signature}" target="_blank" style="color:var(--b)">\${signature.slice(0,16)}…</a>\`);
    const {ok} = getTg();
    if(ok) sendTg(\`🔴 \u041f\u0420\u041e\u0414\u0410\u041d\u041e: \${sym}\\n\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u043e: ~\${solReceived} SOL\\nhttps://dexscreener.com/solana/\${mint}\`);
    setTimeout(refreshWallet, 5000);
  } catch(e) { botMsg('⚠️ ' + e.message); }
}


// ── DIVE ANALYZER ─────────────────────────────────────────────────────────────
async function runAnalyze(addr){
  addr=addr.trim();
  const t=typing();
  try{
    // Fetch DEX + Holders in parallel
    const [dexRes, holdersRes] = await Promise.all([
      fetch(DEX+'/latest/dex/tokens/'+addr).then(x=>x.json()),
      getSolanaHolders(addr)
    ]);
    const pairs=(dexRes.pairs||[]).filter(p=>p.chainId==='solana');
    rmTyping();
    if(!pairs.length){botMsg('🔍 \u0422\u043e\u043a\u0435\u043d \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u043d\u0430 Solana. \u041f\u0440\u043e\u0432\u0435\u0440\u044c \u0430\u0434\u0440\u0435\u0441.');return;}
    const p=pairs[0];
    const sym=p.baseToken?.symbol||'?';
    const mcap=p.fdv||p.marketCap||0,liq=p.liquidity?.usd||0;
    const buys=p.txns?.h24?.buys||0,sells=p.txns?.h24?.sells||0;
    const age=p.pairCreatedAt?Date.now()-p.pairCreatedAt:null;
    const hasTg=!!p.info?.socials?.find(s=>s.type==='telegram');
    const hasTw=!!p.info?.socials?.find(s=>s.type==='twitter');
    const hasSite=!!p.info?.websites?.length;
    // Rug score
    let rug=0;
    if(liq<5000)rug+=30;else if(liq<20000)rug+=12;
    if(!hasTg&&!hasTw&&!hasSite)rug+=22;
    if(age&&age<1800000)rug+=12;
    if(buys<10)rug+=15;if(sells>buys*3)rug+=15;
    if(holdersRes.topHolderPct>20)rug+=20;
    rug=Math.min(100,rug);
    const rugClr=rug>=70?'var(--r)':rug>=40?'var(--y)':'var(--g)';
    const bp=buys+sells>0?Math.round(buys/(buys+sells)*100):50;
    const conv=score(p),st=sigType(conv);
    // Holders HTML
    const holdersHtml=holdersRes.holders.length?\`
      <div class="tc" style="margin-top:5px">
        <div class="sec-lbl" style="margin-bottom:6px">🔗 \u0422\u043e\u043f \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043b\u0438 (on-chain)</div>
        \${holdersRes.holders.map((h,i)=>\`
          <div class="holder-row">
            <div><span class="holder-addr">\${h.addr.slice(0,8)}…\${h.addr.slice(-4)}</span>
            \${h.isTop?\`<span class="dev-flag">⚠️ DEV?</span>\`:''}</div>
            <div class="holder-pct" style="color:\${h.pct>20?'var(--r)':h.pct>10?'var(--y)':'var(--g)'}">\${h.pct.toFixed(1)}%</div>
          </div>\`).join('')}
        \${holdersRes.topHolderPct>20?\`<div style="font-size:11px;color:var(--r);margin-top:5px">⚠️ \u0422\u043e\u043f \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043b\u044c \${holdersRes.topHolderPct.toFixed(0)}% — \u0432\u044b\u0441\u043e\u043a\u0438\u0439 \u0440\u0438\u0441\u043a dump</div>\`:''}
      </div>\`:
      \`<div style="font-size:11px;color:var(--dim);margin-top:5px">\u0414\u0430\u043d\u043d\u044b\u0435 \u043e \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043b\u044f\u0445 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b (RPC timeout)</div>\`;
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">🔍 <b>\u0410\u043d\u0430\u043b\u0438\u0437 \${esc(sym)}</b>
      \${tokenCard(p)}
      <div class="tc" style="margin-top:5px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:11px;color:var(--dim)">🛡 Rug Risk</span>
          <b style="color:\${rugClr}">\${rug}/100 \${rug>=70?'⛔ \u0412\u042b\u0421\u041e\u041a\u0418\u0419':rug>=40?'⚠️ \u0421\u0420\u0415\u0414\u041d\u0418\u0419':'✅ \u041d\u0418\u0417\u041a\u0418\u0419'}</b>
        </div>
        <div class="rug-bar"><div class="rug-f" style="width:\${rug}%;background:\${rugClr}"></div></div>
        <div style="display:flex;gap:12px;margin-top:7px">
          <span style="font-size:11px">TG \${hasTg?'✅':'❌'}</span>
          <span style="font-size:11px">TW \${hasTw?'✅':'❌'}</span>
          <span style="font-size:11px">\u0421\u0430\u0439\u0442 \${hasSite?'✅':'❌'}</span>
          <span style="font-size:11px">Buy% <b style="color:\${bp>55?'var(--g)':'var(--r)'}">\${bp}%</b></span>
        </div>
      </div>
      \${holdersHtml}
    </div>\`;
    document.getElementById('chat').appendChild(d);scroll();
    lastTokenCtx=\`\u0422\u043e\u043a\u0435\u043d: \${sym} | Mcap: $\${f$(mcap)} | \u041b\u0438\u043a\u0432\u0438\u0434\u043d\u043e\u0441\u0442\u044c: $\${f$(liq)} | Rug: \${rug}/100 | Buy pressure: \${bp}%\`;
    setTimeout(()=>askAgents(\`🔬 COUNCIL: \u0442\u043e\u043a\u0435\u043d \${sym}\n\n📊 mcap=\$\${f\$(mcap)}, \u043b\u0438\u043a\u0432\u0438\u0434\u043d\u043e\u0441\u0442\u044c=\$\${f\$(liq)}, rug=\${rug}/100, buy pressure=\${bp}%, \u0442\u043e\u043f \u0434\u0435\u0440\u0436\u0430\u0442\u0435\u043b\u044c=\${holdersRes.topHolderPct.toFixed(0)}%.\nSocials: TG=\${hasTg?'✅':'❌'} TW=\${hasTw?'✅':'❌'} \u0421\u0430\u0439\u0442=\${hasSite?'✅':'❌'}.\n\n\u0410\u043d\u0430\u043b\u0438\u0437 \u0447\u0435\u0440\u0435\u0437 \u0441\u043e\u0432\u0435\u0442 \u0430\u0433\u0435\u043d\u0442\u043e\u0432: Grok — rug-\u0440\u0438\u0441\u043a\u0438 \u0438 \u043a\u0440\u0430\u0441\u043d\u044b\u0435 \u0444\u043b\u0430\u0433\u0438, Lucas — \u043d\u0430\u0440\u0440\u0430\u0442\u0438\u0432 \u0438 \u043f\u043e\u0442\u0435\u043d\u0446\u0438\u0430\u043b x10, Architect — \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 \u0440\u044b\u043d\u043a\u0430 \u0438 \u0442\u0440\u0435\u043d\u0434, Rex — \u0435\u0441\u0442\u044c \u043b\u0438 \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0435\u043d\u044c\u0433\u0438. \u0421\u0442\u043e\u0438\u0442 \u0444\u043b\u0438\u043f\u0430\u0442\u044c?\`),200);
  }catch(e){rmTyping();botMsg('⚠️ '+esc(e.message));}
}

// ── SOLANA ON-CHAIN HOLDERS ────────────────────────────────────────────────────
async function getSolanaHolders(mintAddr){
  try{
    const resp=await fetch(SOL_RPC,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenLargestAccounts',params:[mintAddr]})});
    const data=await resp.json();
    const accounts=(data.result?.value||[]);
    if(!accounts.length) return {holders:[],topHolderPct:0};
    // Total supply from first endpoint
    const supplyResp=await fetch(SOL_RPC,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:2,method:'getTokenSupply',params:[mintAddr]})});
    const supplyData=await supplyResp.json();
    const totalSupply=parseFloat(supplyData.result?.value?.uiAmount||0);
    if(!totalSupply) return {holders:[],topHolderPct:0};
    const top5=accounts.slice(0,5).map((a,i)=>{
      const bal=parseFloat(a.uiAmount||0);
      const pct=totalSupply>0?(bal/totalSupply*100):0;
      return {addr:a.address,bal,pct,isTop:i===0&&pct>15};
    });
    return {holders:top5,topHolderPct:top5[0]?.pct||0};
  }catch(e){return {holders:[],topHolderPct:0};}
}

// ── TELEGRAM PUSH ─────────────────────────────────────────────────────────────
async function getTg(){
  const tok=localStorage.getItem('gl_telegram');
  const chat=localStorage.getItem('gl_tg_chat');
  return {tok,chat,ok:!!tok&&!!chat};
}

async function fmtTgMsg(sym,addr,c1h,vol1h,liq,buys,sells,ageMs){
  const dir=c1h>=0?'📈':'📉';
  const tg=c1h>=0?'+':'';
  const dexUrl='https://dexscreener.com/solana/'+addr;
  return \`🔥 <b>\${sym}</b> · Solana\\n⏱ \${fAge(ageMs)} · \${dir} <b>\${tg}\${c1h.toFixed(1)}%</b>\\nVol 1\u0447: <b>\${f$(vol1h)}</b> · Liq: <b>\${f$(liq)}</b>\\nB/S: <b>\${buys}B / \${sells}S</b>\\n🔗 \${dexUrl}\`;
}

async function sendTg(text){
  const {tok,chat,ok}=getTg();
  if(!ok)return false;
  try{
    await fetch(\`https://api.telegram.org/bot\${tok}/sendMessage\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text,parse_mode:'HTML',disable_web_page_preview:true})});
    return true;
  }catch(e){return false;}
}

async function pushOneTg(sym,addr,c1h,vol1h,liq,buys,sells,ageMs){
  const {ok}=getTg();
  if(!ok){botMsg('📤 \u041d\u0430\u0441\u0442\u0440\u043e\u0439 Telegram: \u0432\u0432\u0435\u0434\u0438 <b>tg setup</b>');return;}
  const msg=fmtTgMsg(sym,addr,c1h,vol1h,liq,buys,sells,ageMs);
  const sent=await sendTg(msg);
  botMsg(sent?\`✅ \u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e \u0432 TG: <b>\${esc(sym)}</b>\`:\`⚠️ \u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u043f\u0440\u0430\u0432\u043a\u0438 \u0432 TG\`);
}

async function autoTgPush(pairs){
  const {ok}=getTg();
  if(!ok||!pairs.length)return;
  for(const p of pairs.slice(0,3)){
    const addr=p.baseToken?.address||'';
    if(pushed.has(addr))continue;
    const c1=parseFloat(p.priceChange?.h1||0);
    const vol1=p.volume?.h1||0, liq=p.liquidity?.usd||0;
    const buys=p.txns?.h24?.buys||0, sells=p.txns?.h24?.sells||0;
    const ageMs=p.pairCreatedAt?Date.now()-p.pairCreatedAt:0;
    const msg=fmtTgMsg(p.baseToken?.symbol||'?',addr,c1,vol1,liq,buys,sells,ageMs);
    await sendTg(msg);
    pushed.add(addr);
    localStorage.setItem('gl_pushed',JSON.stringify([...pushed].slice(-200)));
  }
}

async function setupTg(){
  botMsg(\`📬 <b>\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430 Telegram \u043f\u0443\u0448\u0430</b><br><br>
1. \u0421\u043e\u0437\u0434\u0430\u0439 \u0431\u043e\u0442\u0430: <a href="https://t.me/BotFather" target="_blank" style="color:var(--b)">@BotFather</a> → /newbot<br>
2. \u0414\u043e\u0431\u0430\u0432\u044c \u0431\u043e\u0442\u0430 \u0432 \u043a\u0430\u043d\u0430\u043b <b>X100Agent</b> \u043a\u0430\u043a \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430<br>
3. \u0412\u0432\u0435\u0434\u0438: <i>tg token YOUR_BOT_TOKEN</i><br>
4. \u0412\u0432\u0435\u0434\u0438: <i>tg chat @X100Agent</i> (\u0438\u043b\u0438 ID \u0447\u0430\u0442\u0430)<br><br>
\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0441\u0442\u0430\u0442\u0443\u0441: \${getTg().ok?'✅ \u041d\u0430\u0441\u0442\u0440\u043e\u0435\u043d':'❌ \u041d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d'}\`);
}

// ── AI CHAT ───────────────────────────────────────────────────────────────────
// ── AI WARM-UP ─────────────────────────────────────────────────────────────────
async function warmupApi(){
  try{await fetch('https://godlocal-api.onrender.com/api/health',{signal:AbortSignal.timeout(8000)});}catch(e){}
}

// ── AI CHAT ───────────────────────────────────────────────────────────────────
async function askAI(question){
  const portCtx=portfolio.length?`\n\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c: ${portfolio.map(p=>esc(p.sym)||p.addr?.slice(0,6)||'?').join(', ')}.`:'';
  const ctx=lastTokenCtx?'\n\n'+lastTokenCtx:'';
  const prompt=`${question}${portCtx}${ctx}`;
  const t=typing();
  const tb0=t.querySelector('.bbl');
  if(tb0) tb0.innerHTML='<div class="dots"><span>●</span><span>●</span><span>●</span></div>';
  try{
    await warmupApi();
    let reply='';
    let thinkEl=null;
    let thinkText='';
    await new Promise((resolve)=>{
      const ws=new WebSocket('wss://godlocal-api.onrender.com/ws/oasis');
      const timer=setTimeout(()=>{ws.close();resolve();},40000);
      ws.onopen=()=>ws.send(JSON.stringify({prompt:prompt,session_id:'smertch-adv'}));
      ws.onmessage=(e)=>{
        try{
          const d=JSON.parse(e.data);
          // ── thinking events ──
          if(d.t==='thinking_start'){
            thinkText='';
            const tb=t.querySelector('.bbl');
            if(tb){
              thinkEl=document.createElement('div');
              thinkEl.style.cssText='font-size:10px;color:#6C5CE7;margin-bottom:6px;opacity:.7;';
              thinkEl.innerHTML='🧠 \u0434\u0443\u043c\u0430\u044e...';
              tb.innerHTML='';
              tb.appendChild(thinkEl);
            }
          }
          else if(d.t==='thinking'&&d.v){
            thinkText+='\n'+d.v;
            if(thinkEl) thinkEl.innerHTML='🧠 '+d.v;
          }
          else if(d.t==='thinking_done'){
            if(thinkEl) thinkEl.style.opacity='.35';
          }
          // ── tool events ──
          else if(d.t==='tool_start'&&d.v){
            const tb=t.querySelector('.bbl');
            if(tb&&thinkEl){const s=document.createElement('div');s.style.cssText='font-size:10px;color:#00b4d8;margin-bottom:4px;';s.textContent='⚡ '+d.v;tb.insertBefore(s,thinkEl.nextSibling);}
          }
          // ── token stream ──
          else if(d.t==='token'&&d.v){
            reply+=d.v;
            const tb=t.querySelector('.bbl');
            if(tb){
              const md=reply.replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
              if(thinkEl){
                const wrap=document.createElement('div');
                wrap.innerHTML=md;
                tb.innerHTML='';
                if(thinkEl) tb.appendChild(thinkEl);
                tb.innerHTML+=md;
              } else {
                tb.innerHTML=md;
              }
            }
          }
          else if(d.t==='error') reply='⚠️ '+d.v;
          if(d.t==='done'){clearTimeout(timer);ws.close();resolve();}
        }catch(ex){reply+=e.data||'';}
      };
      ws.onerror=()=>{clearTimeout(timer);resolve();};
      ws.onclose=()=>{clearTimeout(timer);resolve();};
    });
    rmTyping();
    if(reply) botMsg(reply.replace(/</g,'&lt;').replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>'));
    else botMsg('⚠️ \u041d\u0435\u0442 \u043e\u0442\u0432\u0435\u0442\u0430. \u0421\u0435\u0440\u0432\u0435\u0440 \u043f\u0440\u043e\u0441\u044b\u043f\u0430\u0435\u0442\u0441\u044f (~20 \u0441\u0435\u043a) — \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437.');
  }catch(e){rmTyping();botMsg('⚠️ AI: '+esc(e.message));}
}
// ── COMMAND ROUTER ────────────────────────────────────────────────────────────
const SOL_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function cmd(text){
  text=text.trim();
  const tl=text.toLowerCase();
  if(SOL_RE.test(text)){await runAnalyze(text);return;}
  const am=text.match(/^\u0430\u043d\u0430\u043b\u0438\u0437\\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  if(am){await runAnalyze(am[1]);return;}
  // entry: "\u0432\u0445\u043e\u0434 SYM price sol"
  const em=tl.match(/^\u0432\u0445\u043e\u0434\\s+(\\S+)\\s+([\\d.]+)\\s*([\\d.]*)/);
  if(em){
    const sym=em[1].toUpperCase(),entry=parseFloat(em[2]),sol=parseFloat(em[3])||0;
    const pos=portfolio.find(p=>p.sym?.toUpperCase()===sym);
    if(pos){pos.entry=entry;if(sol)pos.sol=sol;localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));botMsg(\`✅ \${esc(sym)} \u043e\u0431\u043d\u043e\u0432\u043b\u0451\u043d: \u0432\u0445\u043e\u0434 \${f$(entry)}\${sol?' · '+sol+' SOL':''}\`);}
    else{portfolio.push({id:Date.now(),addr:'',sym,entry,sol,ts:Date.now()});localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));botMsg(\`✅ \${esc(sym)}: \u0432\u0445\u043e\u0434 \${f$(entry)} · \${sol} SOL\`);}
    return;
  }
  // TG commands
  if(tl==='tg setup'||tl==='\u0442\u0435\u043b\u0435\u0433\u0440\u0430\u043c'){await setupTg();return;}
  const tgTok=tl.match(/^tg token\\s+(\\S+)/);
  if(tgTok){localStorage.setItem('gl_telegram',tgTok[1]);document.getElementById('tgDot').className='tg-status on';botMsg('✅ Bot token \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d');return;}
  const tgChat=tl.match(/^tg chat\\s+(\\S+)/);
  if(tgChat){localStorage.setItem('gl_tg_chat',tgChat[1]);botMsg('✅ Chat ID \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d. \u0422\u0435\u043f\u0435\u0440\u044c BUY \u0441\u0438\u0433\u043d\u0430\u043b\u044b \u043f\u043e\u0439\u0434\u0443\u0442 \u0432 TG \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.');return;}
  // Commands
  if(tl==='\u0441\u043a\u0430\u043d'||tl==='scan'){await runScan();return;}
  if(tl==='pump'||tl==='pump.fun'){await runPump();return;}
  if(tl==='\u0441\u0438\u0433\u043d\u0430\u043b\u044b'||tl==='signals'){await runSignals();return;}
  if(tl==='\u0431\u0430\u0433'||tl==='bag'){await runBag();return;}
  if(tl==='\u0433\u043e\u0440\u044f\u0447\u0438\u0435'||tl==='hot'){await runHot();return;}
  if(tl==='\u043f\u043e\u043c\u043e\u0449\u044c'||tl==='help'){
    botMsg(\`📖 <b>\u041a\u043e\u043c\u0430\u043d\u0434\u044b</b><br><br>
🌪️ <b>\u0441\u043a\u0430\u043d</b> — \u0442\u043e\u043f \u0442\u043e\u043a\u0435\u043d\u044b Solana (\u0441 \u0444\u0438\u043b\u044c\u0442\u0440\u0430\u043c\u0438)<br>
🔥 <b>pump</b> — pump.fun \u0437\u0430\u043f\u0443\u0441\u043a\u0438 &lt;10 \u043c\u0438\u043d<br>
⚡ <b>\u0441\u0438\u0433\u043d\u0430\u043b\u044b</b> — BUY/SELL<br>
💼 <b>\u0431\u0430\u0433</b> — \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044c + PnL<br>
🔗 <b>[\u0430\u0434\u0440\u0435\u0441]</b> — \u0430\u043d\u0430\u043b\u0438\u0437 + on-chain holders<br>
➕ <b>\u0432\u0445\u043e\u0434 SYM 0.0001 0.5</b> — \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u044e<br>
📤 <b>tg setup</b> — \u043d\u0430\u0441\u0442\u0440\u043e\u0438\u0442\u044c Telegram \u043f\u0443\u0448<br>
⚙️ <b>\u0424\u0438\u043b\u044c\u0442\u0440\u044b</b> — \u043f\u043e mcap / \u043b\u0438\u043a\u0432\u0438\u0434\u043d\u043e\u0441\u0442\u0438 / \u0432\u043e\u0437\u0440\u0430\u0441\u0442\u0443 / BUY only<br>
🧠 <b>\u043b\u044e\u0431\u043e\u0439 \u0432\u043e\u043f\u0440\u043e\u0441</b> — AI \u0441\u0442\u0440\u0430\u0442\u0435\u0433\`);
    return;
  }
  if(tl==='\u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044f'){await askAI('\u0414\u0430\u0439 \u0442\u043e\u043f-5 \u043f\u0440\u0430\u0432\u0438\u043b \u0444\u043b\u0438\u043f\u043f\u0438\u043d\u0433\u0430 \u043c\u0435\u043c\u043a\u043e\u0439\u043d\u043e\u0432 \u043d\u0430 Solana \u0432 2026. \u041a\u0440\u0430\u0442\u043a\u043e \u0438 \u043f\u043e \u0434\u0435\u043b\u0443.');return;}
  await (agentMode ? askAgents(text) : askAI(text));
}

function send(){
  const inp=document.getElementById('inp');
  const text=inp.value.trim();
  if(!text)return;
  inp.value='';inp.style.height='auto';
  userBubble(text);
  cmd(text);
}

// ── AUTO LOOPS ────────────────────────────────────────────────────────────────
function startAutoLoops(){
  clearInterval(tgPushTimer);
  tgPushTimer=setInterval(()=>{if(!killed)runScan();},120000);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
(function init(){
  if(getTg().ok) document.getElementById('tgDot').className='tg-status on';
  botMsg(\`👋 <b>SMERTCH v3</b> — X100 \u043c\u0435\u043c\u043a\u043e\u0439\u043d \u0444\u043b\u0438\u043f\u043f\u0435\u0440<br>
<span style="font-size:12px;color:var(--dim)">pump.fun · on-chain holders · \u0430\u0432\u0442\u043e TG \u043f\u0443\u0448 · \u0444\u0438\u043b\u044c\u0442\u0440\u044b</span><br><br>
\${getTg().ok?'📤 TG \u043f\u0443\u0448: <span style="color:var(--g)">\u0430\u043a\u0442\u0438\u0432\u0435\u043d</span>':'📤 TG \u043f\u0443\u0448: <span style="color:var(--dim)">\u043d\u0430\u0441\u0442\u0440\u043e\u0439 → tg setup</span>'}\`);
  setTimeout(()=>runScan(),700);
  startAutoLoops();
})();



// ══ TAB NAVIGATION ═════════════════════════════════════════════════════════════
const wolfEls = ['chips','fltPanel','chat','input-wrap'];
let currentTab = 'wolf';
async function switchTab(tab){
  currentTab = tab;
  const wolfVisible = tab === 'wolf';
  const mktVisible  = tab === 'market';
  const wltVisible  = tab === 'wallet';

  // Show/hide main content areas
  document.getElementById('chat').style.display         = wolfVisible ? 'flex'  : 'none';
  document.getElementById('marketPanel').style.display  = mktVisible  ? 'flex'  : 'none';
  document.getElementById('walletPanel').style.display  = wltVisible  ? 'flex'  : 'none';

  // Wolf-only chrome
  document.querySelector('.chips').style.display = wolfVisible ? 'flex' : 'none';
  const fp = document.getElementById('fltPanel');
  if(fp) fp.style.display = wolfVisible ? (fp.classList.contains('open') ? 'block' : 'none') : 'none';
  const amb = document.querySelector('.agent-mode-bar');
  if(amb) amb.style.display = wolfVisible ? 'flex' : 'none';

  // Tab highlight
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('tab-' + tab);
  if(activeBtn) activeBtn.classList.add('active');
}

// ══ MARKET MODULE ══════════════════════════════════════════════════════════════
let mktData = [], mktCat = 'top', mktLoaded = {};
const COINGECKO = 'https://api.coingecko.com/api/v3';

async function loadMarket(){
  if(mktLoaded[mktCat] && Date.now() - mktLoaded[mktCat] < 60000) return; // 1min cache
  const list = document.getElementById('mktList');
  list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--dim)">⏳ \u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430…</div>';
  try{
    let url;
    if(mktCat === 'top'){
      url = COINGECKO + '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=1h,24h&sparkline=false';
    } else {
      url = COINGECKO + '/coins/markets?vs_currency=usd&category=' + mktCat + '&order=market_cap_desc&per_page=100&page=1&price_change_percentage=1h,24h&sparkline=false';
    }
    const r = await fetch(url);
    if(!r.ok) throw new Error('CoinGecko ' + r.status);
    mktData = await r.json();
    mktLoaded[mktCat] = Date.now();
    renderMarket(mktData);
  }catch(e){
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--dim)">⚠️ ' + e.message + '<br><small>Rate limit — \u043a\u043b\u0438\u043a\u043d\u0438 \u0441\u043d\u043e\u0432\u0430 \u0447\u0435\u0440\u0435\u0437 10 \u0441\u0435\u043a</small></div>';
    mktLoaded[mktCat] = Date.now() - 50000; // allow retry after 10s
  }
}

let _mktCatTimer=null;
function mktSetCat(cat, el){
  mktCat = cat;
  document.querySelectorAll('.mkt-cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  clearTimeout(_mktCatTimer);
  _mktCatTimer = setTimeout(loadMarket, 300); // 300ms debounce
}

function mktFilter(q){
  if(!q) { renderMarket(mktData); return; }
  const ql = q.toLowerCase();
  renderMarket(mktData.filter(c => c.symbol.toLowerCase().includes(ql) || c.name.toLowerCase().includes(ql)));
}

function fmtPrice(p){
  if(!p && p!==0) return '—';
  if(p >= 1000) return '$' + p.toLocaleString('en-US', {maximumFractionDigits:0});
  if(p >= 1) return '$' + p.toLocaleString('en-US', {maximumFractionDigits:2});
  if(p >= 0.01) return '$' + p.toFixed(4);
  return '$' + p.toFixed(8);
}
function fmtMcap(v){
  if(!v) return '';
  if(v >= 1e12) return '$' + (v/1e12).toFixed(2)+'T';
  if(v >= 1e9) return '$' + (v/1e9).toFixed(2)+'B';
  if(v >= 1e6) return '$' + (v/1e6).toFixed(1)+'M';
  return '$' + (v/1e3).toFixed(0)+'K';
}

function renderMarket(coins){
  const list = document.getElementById('mktList');
  if(!coins.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--dim)">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>';return;}
  list.innerHTML = coins.map((c,i) => {
    const chg = c.price_change_percentage_24h || 0;
    const chgCls = chg >= 0 ? 'up' : 'dn';
    const chgStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
    return \`<div class="mkt-row" onclick="mktOpenCoin('\${c.id}','\${c.symbol.toUpperCase()}','\${esc(c.name)}',\${c.current_price||0},\${chg})">
      <span class="mkt-rank">\${c.market_cap_rank||i+1}</span>
      <img class="mkt-icon" src="\${c.image||''}" alt="\${c.symbol}" onerror="this.style.display='none'">
      <div class="mkt-info">
        <div class="mkt-sym">\${c.symbol.toUpperCase()}</div>
        <div class="mkt-name">\${esc(c.name)}</div>
      </div>
      <div class="mkt-right">
        <div class="mkt-price">\${fmtPrice(c.current_price)}</div>
        <div class="mkt-chg \${chgCls}">\${chgStr}</div>
        <div class="mkt-mcap">\${fmtMcap(c.market_cap)}</div>
      </div>
    </div>\`;
  }).join('');
}

async function mktOpenCoin(id, sym, name, price, chg){
  // Switch to WOLF tab and analyze
  switchTab('wolf');
  const ctx = \`\${sym} (\${name}) | \u0426\u0435\u043d\u0430: \${fmtPrice(price)} | 24h: \${chg>=0?'+':''}+\${chg.toFixed(2)}%\`;
  lastTokenCtx = ctx;
  const q = \`\u0410\u043d\u0430\u043b\u0438\u0437 \${sym}: \u0446\u0435\u043d\u0430 \${fmtPrice(price)}, 24h \${chg>=0?'+':''}+\${chg.toFixed(2)}%. \u0421\u0442\u043e\u0438\u0442 \u0432\u0445\u043e\u0434\u0438\u0442\u044c?\`;
  userBubble(q);
  agentMode ? askAgents(q) : askAI(q);
}

// ══ PHANTOM WALLET MODULE ═══════════════════════════════════════════════════════
let phantomPubkey = null;
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
let solPrice = 0;
let swapMode = 'buy'; // buy = SOL→TOKEN, sell = TOKEN→SOL
let quoteTimer = null;

async function connectPhantom(){
  const phantom = window.solana || window.phantom?.solana;
  if(!phantom || !phantom.isPhantom){
    const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if(isMobile){
      const u=encodeURIComponent(window.location.href);
      botMsg('📱 \u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c \u0432 Phantom app...');
      setTimeout(()=>{window.location.href='https://phantom.app/ul/browse/'+u+'?ref='+u;},300);
    }else{
      botMsg('👻 Phantom \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d. \u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u0435 \u043d\u0430 \u0434\u0435\u0441\u043a\u0442\u043e\u043f\u0435.');
    };
    return;
  }
  try{
    const resp = await phantom.connect();
    phantomPubkey = resp.publicKey.toString();
    document.getElementById('walletDisconnected').style.display = 'none';
    document.getElementById('walletConnected').style.display = 'block';
    document.getElementById('walletAddr').textContent = phantomPubkey.slice(0,6) + '...' + phantomPubkey.slice(-4) + ' 📋';
    document.getElementById('walletAddr').onclick = () => {navigator.clipboard.writeText(phantomPubkey); document.getElementById('walletAddr').textContent = '✅ \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e!'; setTimeout(() => document.getElementById('walletAddr').textContent = phantomPubkey.slice(0,6)+'...'+phantomPubkey.slice(-4)+' 📋', 1500);};
    refreshWallet();
  }catch(e){
    botMsg('⚠️ \u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f: ' + e.message);
  }
}

async function refreshWallet(){
  if(!phantomPubkey) return;
  // SOL balance
  try{
    const r = await fetch(SOL_RPC, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[phantomPubkey]})
    });
    const d = await r.json();
    const sol = (d.result?.value || 0) / 1e9;
    document.getElementById('solBal').textContent = sol.toFixed(4) + ' SOL';
    // Get SOL price
    const pr = await fetch(COINGECKO + '/simple/price?ids=solana&vs_currencies=usd');
    const pd = await pr.json();
    solPrice = pd.solana?.usd || 0;
    document.getElementById('solUsd').textContent = '$' + (sol * solPrice).toFixed(2);
  }catch(e){}
  // SPL token accounts
  loadTokenAccounts();
}

async function loadTokenAccounts(){
  if(!phantomPubkey) return;
  try{
    const r = await fetch(SOL_RPC, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        jsonrpc:'2.0', id:1, method:'getTokenAccountsByOwner',
        params:[phantomPubkey,
          {programId:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'},
          {encoding:'jsonParsed', commitment:'confirmed'}
        ]
      })
    });
    const d = await r.json();
    const accounts = (d.result?.value || [])
      .map(a => a.account.data.parsed.info)
      .filter(a => a.tokenAmount.uiAmount > 0)
      .sort((a,b) => b.tokenAmount.uiAmount - a.tokenAmount.uiAmount)
      .slice(0, 20);

    const list = document.getElementById('tokenList');
    if(!accounts.length){ list.innerHTML='<div style="color:var(--dim);font-size:12px;text-align:center;padding:16px">\u041d\u0435\u0442 \u0442\u043e\u043a\u0435\u043d\u043e\u0432 \u0432 \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u0435</div>'; return; }
    list.innerHTML = accounts.map(a => {
      const mint = a.mint;
      const amt = a.tokenAmount.uiAmount;
      const short = mint.slice(0,4)+'...'+mint.slice(-4);
      return \`<div class="tok-row" style="cursor:default">
        <div style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer" onclick="fillSwapAddr('\${mint}')">
          <div class="tok-ico">🪙</div>
          <div class="tok-info">
            <div class="tok-sym">\${short}</div>
            <div class="tok-amt">Bal: \${amt.toLocaleString('en-US',{maximumFractionDigits:4})}</div>
          </div>
        </div>
        <button class="cb cb-r" style="font-size:10px;padding:3px 10px;flex-shrink:0" onclick="quickSellNow('\${mint}','\${short}',\${amt},6)">💰 \u041f\u0440\u043e\u0434\u0430\u0442\u044c</button>
      </div>\`;
    }).join('');
  }catch(e){}
}

async function fillSwapAddr(mint){
  document.getElementById('swapToAddr').value = mint;
  document.getElementById('swapToLabel').textContent = mint.slice(0,4)+'...';
  debounceQuote();
}

async function setSwapMode(mode){
  swapMode = mode;
  document.getElementById('swapTabBuy').classList.toggle('active', mode==='buy');
  document.getElementById('swapTabSell').classList.toggle('active', mode==='sell');
  document.getElementById('swapFromLabel').textContent = mode==='buy' ? 'SOL' : 'TOKEN';
  document.getElementById('swapAmt').placeholder = mode==='buy' ? '\u041a\u043e\u043b-\u0432\u043e SOL' : '\u041a\u043e\u043b-\u0432\u043e \u0442\u043e\u043a\u0435\u043d\u043e\u0432';
  document.getElementById('swapQuote').textContent = '';
}

async function debounceQuote(){
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(getSwapQuote, 600);
}

async function getSwapQuote(){
  const amt = parseFloat(document.getElementById('swapAmt').value);
  const toAddr = document.getElementById('swapToAddr').value.trim();
  if(!amt || !toAddr) return;
  const quoteEl = document.getElementById('swapQuote');
  quoteEl.textContent = '⏳ \u041f\u043e\u043b\u0443\u0447\u0430\u044e \u043a\u043e\u0442\u0438\u0440\u043e\u0432\u043a\u0443…';
  try{
    const inputMint = swapMode==='buy' ? WSOL_MINT : toAddr;
    const outputMint = swapMode==='buy' ? toAddr : WSOL_MINT;
    const decimals = swapMode==='buy' ? 9 : 6;
    const amtLamports = Math.round(amt * Math.pow(10, decimals));
    const url = \`https://quote-api.jup.ag/v6/quote?inputMint=\${inputMint}&outputMint=\${outputMint}&amount=\${amtLamports}&slippageBps=300\`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('Jupiter API ' + r.status);
    const q = await r.json();
    if(q.error) throw new Error(q.error);
    const outAmt = parseInt(q.outAmount);
    const outDecimals = swapMode==='buy' ? 6 : 9;
    const outFmt = (outAmt / Math.pow(10, outDecimals)).toFixed(swapMode==='buy'?4:6);
    const priceImpact = parseFloat(q.priceImpactPct || 0);
    const impactColor = priceImpact > 5 ? '#ff4d6d' : priceImpact > 2 ? '#FDCB6E' : '#00FF9D';
    quoteEl.innerHTML = \`\u041f\u043e\u043b\u0443\u0447\u0438\u0448\u044c ≈ <b>\${outFmt}</b> | \u041f\u0440\u043e\u0441\u043a\u0430\u043b\u044c\u0437\u044b\u0432\u0430\u043d\u0438\u0435: <span style="color:\${impactColor}">\${priceImpact.toFixed(2)}%</span>\`;
    quoteEl.dataset.quote = JSON.stringify(q);
  }catch(e){
    quoteEl.textContent = '⚠️ ' + e.message;
  }
}

async function execSwap(){
  if(!phantomPubkey){ botMsg('👻 \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438 Phantom \u043a\u043e\u0448\u0435\u043b\u0451\u043a'); switchTab('wallet'); return; }
  const quoteEl = document.getElementById('swapQuote');
  const quoteData = quoteEl.dataset.quote;
  if(!quoteData){ botMsg('⚠️ \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u043e\u043b\u0443\u0447\u0438 \u043a\u043e\u0442\u0438\u0440\u043e\u0432\u043a\u0443'); return; }
  const btn = document.getElementById('swapBtn');
  btn.disabled = true;
  btn.textContent = '⏳ \u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u0442\u0440\u0430\u043d\u0437\u0430\u043a\u0446\u0438\u0438…';
  try{
    const q = JSON.parse(quoteData);
    // Get swap transaction from Jupiter
    const swapResp = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        quoteResponse: q,
        userPublicKey: phantomPubkey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    if(!swapResp.ok) throw new Error('Jupiter swap API ' + swapResp.status);
    const { swapTransaction } = await swapResp.json();
    // Decode + sign with Phantom
    btn.textContent = '✍️ \u041f\u043e\u0434\u043f\u0438\u0448\u0438 \u0432 Phantom…';
    const phantom = window.solana || window.phantom?.solana;
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
    const signed = await phantom.signTransaction({
      serialize: () => txBuf,
      deserialize: (b) => b
    });
    // Actually use signAndSendTransaction for simplicity
    btn.textContent = '📡 \u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430…';
    const {signature} = await phantom.signAndSendTransaction(
      { serialize: () => txBuf }
    );
    btn.textContent = '✅ \u0423\u0441\u043f\u0435\u0448\u043d\u043e!';
    botMsg(\`✅ <b>\u0421\u0432\u043e\u043f \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d!</b><br>TX: <a href="https://solscan.io/tx/\${signature}" target="_blank" style="color:var(--b)">\${signature.slice(0,16)}…</a>\`);
    setTimeout(()=>{btn.disabled=false;btn.textContent='⚡ \u0421\u0412\u041e\u041f';},3000);
    setTimeout(refreshWallet, 5000);
  }catch(e){
    btn.disabled=false;
    btn.textContent='⚡ \u0421\u0412\u041e\u041f';
    botMsg('⚠️ \u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0432\u043e\u043f\u0430: ' + e.message);
  }
}

// ── OASIS AGENT MODE ──────────────────────────────────────────────────────────
const AGENT_COLORS = {
  'GodLocal': '#00FF9D',
  'Architect': '#6C5CE7',
  'Builder':   '#00B894',
  'Grok':      '#0984E3',
  'Lucas':     '#FDCB6E',
  'Harper':    '#E17055',
  'Benjamin':  '#A29BFE',
};
const AGENT_ICONS = {
  'GodLocal':  '🐺',
  'Architect': '🏛',
  'Builder':   '🔨',
  'Grok':      '📊',
  'Lucas':     '🫀',
  'Harper':    '🔬',
  'Benjamin':  '📜',
};
let agentMode = false;
let lastTokenCtx = '';

async function toggleAgentMode(){
  agentMode = !agentMode;
  const btn = document.getElementById('agentToggle');
  const bar = document.getElementById('agentModeBar');
  btn.classList.toggle('active', agentMode);
  bar.style.display = agentMode ? 'block' : 'none';
  botMsg(agentMode
    ? '🤖 <b>Oasis Council \u0432\u043a\u043b\u044e\u0447\u0451\u043d</b> — GodLocal + 2 \u0430\u0440\u0445\u0435\u0442\u0438\u043f\u0430 (Architect/Builder/Grok/Lucas/Harper/Benjamin). \u041f\u043e\u0441\u043b\u0435 \u0430\u043d\u0430\u043b\u0438\u0437\u0430 \u0442\u043e\u043a\u0435\u043d\u0430 \u0430\u0433\u0435\u043d\u0442\u044b \u0432\u0438\u0434\u044f\u0442 \u0435\u0433\u043e \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442.'
    : '💬 Wolf AI (\u043e\u0431\u044b\u0447\u043d\u044b\u0439 \u0447\u0430\u0442).'
  );
}

function agentBubble(agentName, html){
  const color = AGENT_COLORS[agentName] || '#a79cf7';
  const icon = AGENT_ICONS[agentName] || '🤖';
  const d = document.createElement('div');
  d.className = 'msg bot';
  d.innerHTML = \`<div class="bbl" style="border-left:3px solid \${color};padding-left:10px">
    <div style="font-size:10px;color:\${color};font-weight:700;margin-bottom:4px;letter-spacing:.5px">\${icon} \${agentName.toUpperCase()}</div>
    <div class="agent-body">\${html}</div>
  </div>\`;
  document.getElementById('chat').appendChild(d);
  d.scrollIntoView({behavior:'smooth'});
  return d;
}

async function askAgents(question){
  const fullPrompt = lastTokenCtx ? lastTokenCtx + '\\n\\n' + question : question;
  try{
    await warmupApi();
    // GodLocal streams first
    let glEl = null;
    let glReply = '';
    let currentArchEl = null;

    await new Promise((resolve) => {
      const ws = new WebSocket('wss://godlocal-api.onrender.com/ws/oasis');
      const timer = setTimeout(()=>{ws.close();resolve();}, 45000);
      ws.onopen = () => ws.send(JSON.stringify({prompt: fullPrompt, session_id: 'smertch-oasis'}));
      ws.onmessage = (e) => {
        try{
          const d = JSON.parse(e.data);

          if(d.t === 'thinking_start'||d.t === 'thinking'||d.t === 'thinking_done'){
            // thinking — show briefly in GodLocal bubble
            if(d.t === 'thinking' && d.v && glEl){
              const body=glEl.querySelector('.agent-body');
              if(body&&body.innerHTML.includes('dots')) body.innerHTML='<span style="font-size:10px;color:#6C5CE7;opacity:.6">🧠 '+d.v+'</span>';
            }
          }
          else if(d.t === 'agent_start'){
            // GodLocal starts streaming
            glEl = agentBubble(d.agent || 'GodLocal', '<div class="dots"><span>●</span><span>●</span><span>●</span></div>');
          }
          else if(d.t === 'token' && d.v){
            glReply += d.v;
            if(glEl){
              const body = glEl.querySelector('.agent-body');
              if(body) body.innerHTML = stripFuncTags(glReply).replace(/</g,'&lt;').replace(/\\n/g,'<br>').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');
            }
          }
          else if(d.t === 'arch_start'){
            // New archetype starts (already have full reply)
            currentArchEl = agentBubble(d.agent, '<div class="dots"><span>●</span><span>●</span><span>●</span></div>');
          }
          else if(d.t === 'arch_reply'){
            if(currentArchEl){
              const body = currentArchEl.querySelector('.agent-body');
              if(body) body.innerHTML = stripFuncTags(d.v||'').replace(/</g,'&lt;').replace(/\\n/g,'<br>').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');
            }
          }
          else if(d.t === 'synthesis' && d.v){
            const synthEl = agentBubble('\\uD83D\\uDD2E \u0421\u0438\u043d\u0442\u0435\u0437', '');
            const body = synthEl.querySelector('.agent-body');
            if(body) body.innerHTML = '<b>\\u2696\\uFE0F \u0418\u0442\u043e\u0433 \u0441\u043e\u0432\u0435\u0442\u0430:</b><br>' + stripFuncTags(d.v).replace(/</g,'&lt;').replace(/\\n/g,'<br>').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');
          }
          else if(d.t === 'error'){
            agentBubble('System','⚠️ ' + (d.v||'error'));
          }
          if(d.t === 'session_done' || d.t === 'done'){
            if(d.t === 'session_done'){clearTimeout(timer); ws.close(); resolve();}
          }
        }catch(ex){}
      };
      ws.onerror = () => {clearTimeout(timer); resolve();};
      ws.onclose = () => resolve();
    });
  }catch(e){botMsg('⚠️ ' + e.message);}
}

// ── VOICE INPUT ───────────────────────────────────────────────────────────────
let voiceRec=null,voiceActive=false;
function toggleVoice(){
  const btn=document.getElementById('micBtn');
  if(voiceActive){stopVoice();return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){botMsg('⚠️ \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0432\u0432\u043e\u0434 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435');return;}
  voiceRec=new SR();
  voiceRec.lang='ru-RU';
  voiceRec.continuous=false;
  voiceRec.interimResults=true;
  voiceRec.onstart=()=>{voiceActive=true;btn.classList.add('listening');};
  voiceRec.onresult=(e)=>{
    const t=Array.from(e.results).map(r=>r[0].transcript).join('');
    const inp=document.getElementById('inp');
    inp.value=t;inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,110)+'px';
  };
  voiceRec.onend=()=>{
    voiceActive=false;btn.classList.remove('listening');
    const inp=document.getElementById('inp');
    if(inp.value.trim()) send();
  };
  voiceRec.onerror=(e)=>{voiceActive=false;btn.classList.remove('listening');if(e.error!=='aborted')botMsg('⚠️ \u041c\u0438\u043a\u0440\u043e\u0444\u043e\u043d: '+e.error);};
  voiceRec.start();
}
function stopVoice(){if(voiceRec){voiceRec.stop();voiceRec=null;}}

// ── STARTUP ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  botMsg('⚡ <b>SMERTCH WOLF v3.1</b> — Solana AI terminal.<br>\u041d\u0430\u0436\u043c\u0438 <b>🌪️ \u0421\u043a\u0430\u043d</b> \u0434\u043b\u044f \u0430\u043d\u0430\u043b\u0438\u0437\u0430 \u0440\u044b\u043d\u043a\u0430 \u0438\u043b\u0438 \u0432\u0432\u0435\u0434\u0438 \u0442\u043e\u043a\u0435\u043d/\u0430\u0434\u0440\u0435\u0441.');
  warmupApi();
  setTimeout(() => runScan(), 1500);
});
</script>

<!-- ══ MARKET PANEL ══════════════════════════════════════════════ -->
<div id="marketPanel">
  <div class="mkt-cat" id="mktCat">
    <div class="mkt-cat-btn active" onclick="mktSetCat('top',this)">🌐 \u0412\u0441\u0435</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('layer-1',this)">⛓ L1</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('defi',this)">🏦 DeFi</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('meme-token',this)">🐸 \u041c\u0435\u043c</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('ai-big-data',this)">🤖 AI</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('gaming',this)">🎮 Gaming</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('solana-ecosystem',this)">◎ Solana</div>
  </div>
  <input class="mkt-search" id="mktSearch" placeholder="🔍 BTC, ETH, SOL..." oninput="mktFilter(this.value)">
  <div class="mkt-list" id="mktList"><div style="text-align:center;padding:40px;color:var(--dim)">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0440\u044b\u043d\u043a\u0430…</div></div>
</div>

<!-- ══ WALLET PANEL ══════════════════════════════════════════════ -->
<div id="walletPanel">
  <div id="walletDisconnected">
    <div style="text-align:center;padding:24px 16px 8px">
      <div style="font-size:36px;margin-bottom:8px">👻</div>
      <div style="font-size:16px;font-weight:700;color:var(--fg);margin-bottom:6px">Phantom Wallet</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:16px">\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438 \u043a\u043e\u0448\u0435\u043b\u0451\u043a \u0447\u0442\u043e\u0431\u044b \u0432\u0438\u0434\u0435\u0442\u044c \u0431\u0430\u043b\u0430\u043d\u0441 \u0438 \u0442\u043e\u0440\u0433\u043e\u0432\u0430\u0442\u044c \u043f\u0440\u044f\u043c\u043e \u0437\u0434\u0435\u0441\u044c</div>
    </div>
    <div class="wallet-connect-btn" onclick="connectPhantom()">👻 \u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c Phantom</div>
    <div style="font-size:11px;color:var(--dim);text-align:center">\u041d\u0435\u0442 Phantom? <a href="https://phantom.app" target="_blank" style="color:var(--b)">phantom.app</a></div>
  </div>
  <div id="walletConnected" style="display:none">
    <div class="wallet-addr" id="walletAddr"></div>
    <div class="wallet-bal">
      <div>
        <div class="wallet-bal-label">SOL Balance</div>
        <div class="wallet-bal-val" id="solBal">—</div>
      </div>
      <div style="text-align:right">
        <div class="wallet-bal-label">USD Value</div>
        <div class="wallet-bal-usd" id="solUsd">—</div>
      </div>
      <button onclick="refreshWallet()" style="background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer">⟳</button>
    </div>
    <div class="qk-row">
      <span style="font-size:10px;color:var(--dim);margin-right:2px">⚡</span>
      <button class="qk-btn" onclick="setQkSol(0.05,this)">0.05</button>
      <button class="qk-btn active" onclick="setQkSol(0.1,this)">0.1</button>
      <button class="qk-btn" onclick="setQkSol(0.5,this)">0.5</button>
      <button class="qk-btn" onclick="setQkSol(1,this)">1 SOL</button>
    </div>

    <!-- SWAP TERMINAL -->
    <div class="swap-box">
      <div class="swap-title">⚡ \u0422\u043e\u0440\u0433\u043e\u0432\u044b\u0439 \u0442\u0435\u0440\u043c\u0438\u043d\u0430\u043b</div>
      <div class="swap-tabs">
        <div class="swap-tab active" id="swapTabBuy" onclick="setSwapMode('buy')">🟢 \u041a\u0423\u041f\u0418\u0422\u042c</div>
        <div class="swap-tab" id="swapTabSell" onclick="setSwapMode('sell')">🔴 \u041f\u0420\u041e\u0414\u0410\u0422\u042c</div>
      </div>
      <div class="swap-row">
        <input class="swap-inp" id="swapAmt" type="number" placeholder="0.0" step="any" oninput="debounceQuote()">
        <select class="swap-sel" id="swapSolAmt" style="display:none">
          <option value="0.1">0.1 SOL</option>
          <option value="0.5">0.5 SOL</option>
          <option value="1">1 SOL</option>
          <option value="custom">\u0421\u0432\u043e\u0451</option>
        </select>
        <div class="swap-sel" id="swapFromLabel">SOL</div>
      </div>
      <div class="swap-row">
        <input class="swap-inp" id="swapToAddr" placeholder="\u0410\u0434\u0440\u0435\u0441 \u0442\u043e\u043a\u0435\u043d\u0430 (mint)..." style="font-size:11px;font-family:monospace">
        <div class="swap-sel" id="swapToLabel">TOKEN</div>
      </div>
      <div class="swap-quote" id="swapQuote"></div>
      <button class="swap-btn" id="swapBtn" onclick="execSwap()">⚡ \u0421\u0412\u041e\u041f</button>
    </div>

    <!-- TOKEN HOLDINGS -->
    <div style="font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">\u0422\u043e\u043a\u0435\u043d\u044b \u0432 \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u0435</div>
    <div id="tokenList"><div style="color:var(--dim);font-size:12px">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430…</div></div>
  </div>
</div>

<!-- ══ BOTTOM TAB BAR ══════════════════════════════════════════════ -->
<div class="tab-bar">
  <div class="tab active" id="tabWolf" onclick="switchTab('wolf')">
    <span class="tab-ico">⚡</span>WOLF
  </div>
  <div class="tab" id="tabMarket" onclick="switchTab('market')">
    <span class="tab-ico">📊</span>\u0420\u042b\u041d\u041e\u041a
  </div>
  <div class="tab" id="tabWallet" onclick="switchTab('wallet')">
    <span class="tab-ico">💼</span>\u041a\u041e\u0428\u0415\u041b\u0401\u041a
  </div>
</div>

</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'pragma': 'no-cache',
      'expires': '0',
    },
  });
}
