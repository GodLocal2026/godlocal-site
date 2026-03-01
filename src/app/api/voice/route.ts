import { NextResponse } from 'next/server';

const HTML = String.raw`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <meta name="theme-color" content="#0A0C0F"/>
  <title>GodLocal Voice</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0A0C0F;
      --s: #111316;
      --b: #1e2127;
      --g: #00FF9D;
      --p: #6C5CE7;
      --t: #E0E0E0;
      --m: rgba(224,224,224,.45);
      --d: rgba(224,224,224,.18);
    }
    html, body { height:100%; background:var(--bg); color:var(--t);
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      overflow:hidden; -webkit-tap-highlight-color:transparent; }

    #app { display:flex; flex-direction:column; height:100%; }

    /* HEADER */
    header {
      display:flex; align-items:center; justify-content:space-between;
      padding:12px 16px; border-bottom:1px solid var(--b);
      background:rgba(10,12,15,.92); backdrop-filter:blur(12px);
      flex-shrink:0; z-index:10;
    }
    .logo { display:flex; align-items:center; gap:8px; text-decoration:none; color:var(--t); }
    .logo-ico {
      width:26px; height:26px; border-radius:6px;
      background:rgba(0,255,157,.1); border:1px solid rgba(0,255,157,.3);
      display:flex; align-items:center; justify-content:center;
      font-family:monospace; font-weight:700; font-size:12px; color:var(--g);
    }
    .logo-txt { font-weight:700; font-size:15px; }
    .logo-txt span { color:var(--g); }
    .hdr-r { display:flex; align-items:center; gap:10px; }
    #dot { width:7px; height:7px; border-radius:50%; background:#444; transition:all .3s; }
    #dot.on  { background:var(--g); box-shadow:0 0 6px rgba(0,255,157,.7); }
    #dot.err { background:#FF6B6B; }
    #set-btn { background:none; border:none; cursor:pointer; color:var(--m);
      font-size:18px; padding:4px 6px; line-height:1; }

    /* CHAT */
    #chat {
      flex:1; overflow-y:auto; padding:12px 14px 6px;
      display:flex; flex-direction:column; gap:8px;
    }
    #chat::-webkit-scrollbar { width:2px; }
    #chat::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); }

    .msg { display:flex; flex-direction:column; max-width:84%; animation:fu .22s ease; }
    @keyframes fu { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    .msg.u { align-self:flex-end; align-items:flex-end; }
    .msg.a { align-self:flex-start; align-items:flex-start; }
    .bbl { padding:9px 13px; border-radius:15px; font-size:14px; line-height:1.55; }
    .msg.u .bbl { background:rgba(0,255,157,.1); border:1px solid rgba(0,255,157,.2);
      border-bottom-right-radius:3px; }
    .msg.a .bbl { background:var(--s); border:1px solid var(--b);
      border-bottom-left-radius:3px; }
    .ts { font-size:10px; color:var(--d); margin-top:2px; padding:0 3px; font-family:monospace; }

    .dots { display:inline-flex; gap:4px; }
    .dots span { width:6px; height:6px; border-radius:50%; background:var(--g); opacity:.3;
      animation:bk 1.2s infinite; }
    .dots span:nth-child(2){animation-delay:.2s} .dots span:nth-child(3){animation-delay:.4s}
    @keyframes bk{0%,80%,100%{opacity:.2;transform:scale(.9)}40%{opacity:1;transform:scale(1.1)}}

    /* EMPTY */
    #empty { flex:1; display:flex; flex-direction:column; align-items:center;
      justify-content:center; gap:6px; color:var(--d); text-align:center; }
    #empty .em-ico { font-size:44px; opacity:.35; margin-bottom:4px; }
    #empty p { font-size:14px; line-height:1.6; max-width:200px; color:var(--m); }
    #empty small { font-size:11px; font-family:monospace; opacity:.5; }

    /* LIVE BAR */
    #live { flex-shrink:0; padding:4px 18px; min-height:24px; font-size:12px;
      font-style:italic; color:var(--m); opacity:0; transition:opacity .2s; }
    #live.on { opacity:1; }

    /* BOTTOM ZONE */
    #bot {
      flex-shrink:0; padding:12px 14px 20px;
      border-top:1px solid var(--b);
      background:linear-gradient(to top,rgba(0,255,157,.03),transparent);
      display:flex; flex-direction:column; align-items:center; gap:10px;
    }

    #st { font-size:12px; font-family:monospace; color:var(--m); height:15px; transition:color .2s; }
    #st.ls { color:var(--g); } #st.tk { color:var(--p); } #st.sp { color:#00B4D8; }

    /* ORB */
    #orb {
      width:68px; height:68px; border-radius:50%;
      background:var(--s); border:2px solid rgba(0,255,157,.2);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .15s; position:relative;
      -webkit-user-select:none; user-select:none;
      touch-action:manipulation;
      /* CRITICAL for iOS: explicit tap target */
      -webkit-tap-highlight-color:rgba(0,255,157,.15);
      outline:none;
    }
    /* CSS-only active state — works even if JS is slow */
    #orb:active { transform:scale(.93); background:rgba(0,255,157,.12);
      border-color:var(--g); }
    #orb.ls {
      background:rgba(0,255,157,.1); border-color:var(--g);
      animation:pulse 1.4s ease-in-out infinite;
    }
    #orb.tk { background:rgba(108,92,231,.1); border-color:var(--p); }
    #orb.sp { background:rgba(0,180,216,.1); border-color:#00B4D8; }
    @keyframes pulse {
      0%{box-shadow:0 0 0 0 rgba(0,255,157,.4)}
      70%{box-shadow:0 0 0 16px rgba(0,255,157,0)}
      100%{box-shadow:0 0 0 0 rgba(0,255,157,0)}
    }
    #orb-ico { font-size:26px; pointer-events:none; }

    /* TEXT ROW */
    #txt-row {
      display:flex; gap:8px; width:100%; max-width:480px;
    }
    #txt-in {
      flex:1; background:var(--s); border:1px solid var(--b);
      border-radius:20px; color:var(--t); padding:9px 14px;
      font-size:14px; outline:none; min-width:0;
    }
    #txt-in::placeholder { color:var(--d); }
    #txt-in:focus { border-color:rgba(0,255,157,.35); }
    #send-btn {
      background:rgba(0,255,157,.1); border:1px solid rgba(0,255,157,.25);
      border-radius:20px; color:var(--g); padding:9px 14px;
      font-size:13px; cursor:pointer; white-space:nowrap;
      transition:background .15s; touch-action:manipulation;
    }
    #send-btn:active { background:rgba(0,255,157,.2); }

    /* ACTIONS */
    #acts { display:flex; gap:8px; }
    .act {
      padding:5px 12px; border-radius:16px; font-size:11px; font-family:monospace;
      border:1px solid var(--b); background:none; color:var(--m);
      cursor:pointer; transition:all .15s; touch-action:manipulation;
    }
    .act:active { color:var(--t); border-color:rgba(255,255,255,.2); }

    /* SETTINGS PANEL */
    #sp {
      position:absolute; inset:0; background:rgba(10,12,15,.97);
      backdrop-filter:blur(14px); z-index:20;
      display:flex; flex-direction:column; padding:22px 18px; gap:18px;
      transform:translateX(100%); transition:transform .26s cubic-bezier(.4,0,.2,1);
    }
    #sp.open { transform:translateX(0); }
    .sp-hdr { display:flex; align-items:center; justify-content:space-between; }
    .sp-title { font-weight:700; font-size:16px; }
    #sp-close { background:none; border:none; cursor:pointer; color:var(--m); font-size:22px; }
    .sg label { display:block; font-size:11px; font-family:monospace; color:var(--m);
      text-transform:uppercase; letter-spacing:.08em; margin-bottom:7px; }
    .sg select, .sg input {
      width:100%; background:var(--s); border:1px solid var(--b); border-radius:10px;
      color:var(--t); padding:9px 12px; font-size:13px; outline:none;
      -webkit-appearance:none; appearance:none;
    }
    .sg select:focus, .sg input[type="text"]:focus { border-color:rgba(0,255,157,.4); }
    .sp-note { font-size:12px; color:var(--d); line-height:1.5; }
  </style>
</head>
<body>
<div id="app">

  <header>
    <a class="logo" href="/">
      <div class="logo-ico">G</div>
      <span class="logo-txt">God<span>Local</span> Voice</span>
    </a>
    <div class="hdr-r">
      <div id="dot" title="API"></div>
      <button id="set-btn" onclick="openSettings()" aria-label="Settings">&#9881;</button>
    </div>
  </header>

  <div id="chat">
    <div id="empty">
      <div class="em-ico">&#127897;&#65039;</div>
      <p>Нажми кнопку и говори. Или напечатай вопрос.</p>
      <small>GodLocal AI · WebSocket</small>
    </div>
  </div>

  <div id="live"></div>

  <div id="bot">
    <div id="st">нажми чтобы говорить</div>

    <div id="orb" role="button" aria-label="Speak">
      <span id="orb-ico">&#127908;</span>
    </div>

    <div id="txt-row">
      <input id="txt-in" type="text" placeholder="или напечатай здесь…" autocomplete="off" autocorrect="off"/>
      <button id="send-btn" onclick="sendText()">&#9658;</button>
    </div>

    <div id="acts">
      <button class="act" id="mute-btn" onclick="toggleMute()">&#128266; звук</button>
      <button class="act" onclick="clearChat()">&#128465; очистить</button>
    </div>
  </div>

  <div id="sp">
    <div class="sp-hdr">
      <span class="sp-title">&#9881; Настройки</span>
      <button id="sp-close" onclick="closeSettings()">&#215;</button>
    </div>
    <div class="sg">
      <label>Голос TTS</label>
      <select id="v-sel" onchange="saveCfg()"></select>
    </div>
    <div class="sg">
      <label>Скорость речи</label>
      <input type="range" id="rate" min="0.6" max="1.6" step="0.1" value="1.0" oninput="saveCfg()"/>
    </div>
    <div class="sg">
      <label>Персона агента</label>
      <select id="persona" onchange="saveCfg()">
        <option value="j">Jarvis — точный и быстрый</option>
        <option value="s">Sage — вдумчивый и глубокий</option>
        <option value="w">WOLF — прямой, без воды</option>
      </select>
    </div>
    <div class="sg">
      <label>Язык распознавания</label>
      <select id="lang-sel" onchange="saveCfg()">
        <option value="ru-RU">Русский</option>
        <option value="en-US">English</option>
      </select>
    </div>
    <p class="sp-note">Кнопка микрофона: нажми один раз — начать, ещё раз — остановить. Или введи текст внизу.</p>
  </div>

</div>

<script>
(function(){
'use strict';

// ── CFG ──
var WS_URL = 'wss://godlocal-api.onrender.com/ws/chat';
var PERSONAS = {
  j:'You are Jarvis. Be concise, precise, fast. 1-3 sentences max unless asked more.',
  s:'You are Sage, a wise thoughtful AI. Give nuanced, insightful answers.',
  w:'You are WOLF. Blunt, direct, no fluff. Short answers only. Market mindset.'
};
var cfg = {
  voice: ls('vn') || '',
  rate: parseFloat(ls('vr') || '1.0'),
  persona: ls('vp') || 'j',
  lang: ls('vl') || 'ru-RU',
  muted: ls('vm') === '1'
};

function ls(k){ return localStorage.getItem('gl_v_'+k); }
function ss(k,v){ localStorage.setItem('gl_v_'+k,v); }

// ── STATE ──
var ws=null, wsOk=false;
var rec=null, recActive=false;
var synth=window.speechSynthesis;
var voices=[];
var thinkId=null;
var speaking=false;
var streamBuf='';
var streamTimer=null;

// ── ELEMENTS ──
var $chat=document.getElementById('chat');
var $empty=document.getElementById('empty');
var $live=document.getElementById('live');
var $st=document.getElementById('st');
var $orb=document.getElementById('orb');
var $ico=document.getElementById('orb-ico');
var $dot=document.getElementById('dot');
var $mute=document.getElementById('mute-btn');
var $txtIn=document.getElementById('txt-in');

// ── INIT ──
function init(){
  // restore settings UI
  document.getElementById('rate').value = cfg.rate;
  document.getElementById('persona').value = cfg.persona;
  document.getElementById('lang-sel').value = cfg.lang;
  updateMuteBtn();
  loadVoices();
  connectWS();
  bindOrb();
  // enter key on text input
  $txtIn.addEventListener('keydown', function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendText(); }
  });
}

// ── ORB BINDING — iOS safe ──
function bindOrb(){
  // Primary: click event (works on iOS, Android, desktop)
  $orb.addEventListener('click', function(e){
    e.preventDefault();
    toggleListen();
  });
}

function toggleListen(){
  if(speaking){ synth.cancel(); speaking=false; }
  if(recActive){
    stopRec();
  } else {
    startRec();
  }
}

// ── SPEECH RECOGNITION ──
function startRec(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    setStatus('Микрофон не поддерживается — используй текст ниже');
    $txtIn.focus();
    return;
  }
  recActive = true;
  $orb.className='ls'; $ico.textContent='🔴';
  setStatus('слушаю…','ls');

  rec = new SR();
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.lang = cfg.lang;

  rec.onstart = function(){ recActive=true; };

  rec.onresult = function(e){
    var interim='', final='';
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    showLive(final||interim);
    if(final){
      hideLive();
      stopRec(true);
      sendToAgent(final.trim());
    }
  };

  rec.onerror = function(e){
    hideLive();
    recActive=false;
    if(e.error==='not-allowed'){
      setStatus('Нет доступа к микрофону');
    } else if(e.error==='no-speech'){
      setStatus('Не услышал — попробуй ещё раз');
    } else {
      setStatus('Ошибка: '+e.error);
    }
    resetOrb();
    setTimeout(function(){ setStatus('нажми чтобы говорить'); }, 2000);
  };

  rec.onend = function(){
    if(recActive){ recActive=false; resetOrb(); }
  };

  try {
    rec.start();
  } catch(ex){
    recActive=false;
    setStatus('Не удалось запустить микрофон');
    resetOrb();
  }
}

function stopRec(silent){
  recActive=false;
  if(rec){ try{ rec.stop(); }catch(ex){} rec=null; }
  if(!silent) resetOrb();
}

function resetOrb(){
  if(!thinkId && !speaking){
    $orb.className=''; $ico.textContent='🎤';
    setStatus('нажми чтобы говорить');
  }
}

// ── WEBSOCKET ──
function connectWS(){
  try {
    if(ws){ ws.onclose=null; try{ws.close();}catch(e){} }
    ws = new WebSocket(WS_URL);
    setDot('');

    ws.onopen=function(){ wsOk=true; setDot('on'); };
    ws.onerror=function(){ wsOk=false; setDot('err'); };
    ws.onclose=function(){
      wsOk=false; setDot('err');
      setTimeout(connectWS, 5000);
    };

    ws.onmessage=function(e){
      var tok = typeof e.data==='string' ? e.data : '';
      if(!tok) return;
      // remove thinking bubble on first token
      if(thinkId){
        var el=document.getElementById(thinkId);
        if(el) el.remove();
        thinkId=null;
      }
      // stream into bubble
      var bbl=document.getElementById('sb');
      if(!bbl){ bbl=addMsg('a','',{id:'sb'}); }
      var txt=bbl.querySelector('.btxt');
      txt.textContent=(txt.textContent||'')+tok;
      scrollBot();
      // detect end
      clearTimeout(streamTimer);
      streamTimer=setTimeout(function(){
        var el=document.getElementById('sb');
        if(el){
          var t=el.querySelector('.btxt').textContent;
          el.removeAttribute('id');
          setStatus('нажми чтобы говорить'); resetOrb();
          speak(t);
        }
      }, 700);
    };
  } catch(ex){ setDot('err'); }
}

function sendToAgent(text){
  if(!text) return;
  addMsg('u', text);
  thinkId='tk-'+Date.now();
  addThink(thinkId);
  setStatus('думаю…','tk');
  $orb.className='tk'; $ico.textContent='💭';

  var payload=JSON.stringify({
    message: text,
    system: PERSONAS[cfg.persona]||PERSONAS.j,
    service_tokens:{}
  });

  if(wsOk && ws && ws.readyState===1){
    ws.send(payload);
  } else {
    // HTTP fallback
    fetch('https://godlocal-api.onrender.com/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:payload
    })
    .then(function(r){return r.json();})
    .then(function(d){
      if(thinkId){var el=document.getElementById(thinkId);if(el)el.remove();thinkId=null;}
      var reply=d.response||d.message||d.text||'...';
      addMsg('a',reply);
      setStatus('нажми чтобы говорить'); resetOrb();
      speak(reply);
    })
    .catch(function(){
      if(thinkId){var el=document.getElementById(thinkId);if(el)el.remove();thinkId=null;}
      var r='Нет соединения с агентом. Проверь сеть.';
      addMsg('a',r); resetOrb();
    });
  }
}

// text input send
window.sendText=function(){
  var v=$txtIn.value.trim();
  if(!v) return;
  $txtIn.value='';
  if(speaking){synth.cancel();speaking=false;}
  sendToAgent(v);
};

// ── TTS ──
function loadVoices(){
  function load(){
    voices=synth.getVoices();
    var sel=document.getElementById('v-sel');
    sel.innerHTML='<option value="">Авто</option>';
    voices.forEach(function(v){
      var o=document.createElement('option');
      o.value=v.name; o.textContent=v.name+' ('+v.lang+')';
      if(v.name===cfg.voice)o.selected=true;
      sel.appendChild(o);
    });
  }
  load();
  if(synth.onvoiceschanged!==undefined) synth.onvoiceschanged=load;
}

function speak(text){
  if(cfg.muted||!text) return;
  setStatus('говорю…','sp');
  $orb.className='sp'; $ico.textContent='🔊';
  speaking=true;

  // clean markdown
  var clean=text.replace(/[*_~#>\x60]/g,'').replace(/https?:\/\/\S+/g,'').trim();
  // split into sentence chunks for iOS (iOS TTS cuts off long utterances)
  var chunks=[];
  var sents=clean.match(/[^.!?]+[.!?]*/g)||[clean];
  var cur='';
  sents.forEach(function(s){
    if((cur+s).length>160&&cur){chunks.push(cur.trim());cur=s;}
    else cur+=s;
  });
  if(cur.trim())chunks.push(cur.trim());
  chunks=chunks.filter(Boolean);

  var i=0;
  function next(){
    if(!speaking||i>=chunks.length){
      speaking=false; resetOrb();
      return;
    }
    var u=new SpeechSynthesisUtterance(chunks[i++]);
    u.rate=cfg.rate; u.pitch=1.0;
    if(cfg.voice){
      var vx=voices.find(function(v){return v.name===cfg.voice;});
      if(vx)u.voice=vx;
    }
    u.onend=next; u.onerror=next;
    synth.speak(u);
  }
  // iOS: need to kick synth within user gesture context
  // We just proceed with next() directly
  next();
}

// ── UI HELPERS ──
function addMsg(role,text,opts){
  if($empty) $empty.style.display='none';
  var wrap=document.createElement('div');
  wrap.className='msg '+role;
  if(opts&&opts.id)wrap.id=opts.id;
  var bbl=document.createElement('div');
  bbl.className='bbl';
  var span=document.createElement('span');
  span.className='btxt';
  span.textContent=text;
  bbl.appendChild(span);
  var ts=document.createElement('div');
  ts.className='ts';
  ts.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  wrap.appendChild(bbl);
  wrap.appendChild(ts);
  $chat.appendChild(wrap);
  scrollBot();
  return wrap;
}
function addThink(id){
  var wrap=document.createElement('div');
  wrap.className='msg a'; wrap.id=id;
  wrap.innerHTML='<div class="bbl"><div class="dots"><span></span><span></span><span></span></div></div>';
  $chat.appendChild(wrap);
  scrollBot();
}
function scrollBot(){ $chat.scrollTop=$chat.scrollHeight; }
function setStatus(t,cls){ $st.textContent=t; $st.className=cls||''; }
function setDot(cls){ $dot.className=cls; }
function showLive(t){ $live.textContent=t; $live.className='on'; }
function hideLive(){ $live.textContent=''; $live.className=''; }

// ── ACTIONS ──
window.toggleMute=function(){
  cfg.muted=!cfg.muted; ss('vm',cfg.muted?'1':'0');
  if(cfg.muted){synth.cancel();speaking=false;resetOrb();}
  updateMuteBtn();
};
function updateMuteBtn(){
  $mute.textContent=cfg.muted?'🔇 без звука':'🔊 звук';
}
window.clearChat=function(){
  $chat.innerHTML=''; $chat.appendChild($empty); $empty.style.display='';
};
window.openSettings=function(){ document.getElementById('sp').classList.add('open'); };
window.closeSettings=function(){ document.getElementById('sp').classList.remove('open'); };
window.saveCfg=function(){
  cfg.voice=document.getElementById('v-sel').value;
  cfg.rate=parseFloat(document.getElementById('rate').value);
  cfg.persona=document.getElementById('persona').value;
  cfg.lang=document.getElementById('lang-sel').value;
  ss('vn',cfg.voice); ss('vr',cfg.rate); ss('vp',cfg.persona); ss('vl',cfg.lang);
};

// prevent iOS bounce scroll
document.body.addEventListener('touchmove',function(e){
  if(!e.target.closest('#chat'))e.preventDefault();
},{passive:false});

window.addEventListener('load',init);
})();
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
