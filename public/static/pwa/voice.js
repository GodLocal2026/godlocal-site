// VOICE - Extracted JavaScript

(function(){
'use strict';

var API='https://godlocal-api.onrender.com';
var WS_URL='wss://godlocal-api.onrender.com/ws/chat';
var TIMEOUT_MS=22000;
var MAX_HISTORY=6; // keep last 3 exchanges (6 messages)

var PERSONA={
  j:'[Persona: Jarvis — precise, concise, max 2 sentences] ',
  s:'[Persona: Sage — thoughtful, detailed] ',
  w:'[Persona: WOLF — blunt, direct, zero fluff] '
};

// ── CHAT vs TASK DETECTION ────────────────────────────────────────────
// Short conversational: NO tools needed
// TASK_RE: explicit task keywords that need tools
var TASK_RE=/\\b(найди|поищи|поиск|найти|поищи|search|что такое|кто такой|как работает|сколько стоит|какая цена|курс (bitcoin|btc|eth|sol)|погода|новости|переведи|translate|напиши код|создай|github issue|твит|tweet|fetch|open url|загрузи|открой сайт|запомни|вспомни)\\b/i;

function isTaskMessage(text){
  // Always treat as task if long (>100 chars) OR matches task keywords
  if(text.length>100)return true;
  return TASK_RE.test(text);
}

// ── CONVERSATION HISTORY ─────────────────────────────────────────────
// Stores last MAX_HISTORY messages {role:'u'|'a', text:'...'}
var chatHistory=[];

function pushHistory(role, text){
  chatHistory.push({role:role, text:text.slice(0,300)});
  if(chatHistory.length>MAX_HISTORY)chatHistory.shift();
}

function buildContext(){
  if(chatHistory.length===0)return '';
  var lines=chatHistory.map(function(m){
    return (m.role==='u'?'User':'Assistant')+': '+m.text;
  });
  return 'Previous conversation:\
'+lines.join('\
')+'\
\
';
}

// ── BUILD MESSAGE TO AGENT ───────────────────────────────────────────
function buildMsg(userText){
  var persona=cfg.persona&&PERSONA[cfg.persona]?PERSONA[cfg.persona]:'';
  var ctx=buildContext();
  var isTask=isTaskMessage(userText.trim());

  var prefix;
  if(isTask){
    // Agent mode: allow tools, include conversation context
    prefix='[GodLocal AI. '+ctx+'Use tools (web_search, get_market_data, fetch_url, etc.) when needed to answer accurately. Reply in user language.] ';
  }else{
    // Chat mode: NO tool invocation, include conversation context
    prefix='[GodLocal AI. '+ctx+'This is a conversational message — respond naturally and directly WITHOUT calling any tools.] ';
  }
  return prefix+persona+userText;
}

function lsGet(k){return localStorage.getItem('glv_'+k);}
function lsSet(k,v){localStorage.setItem('glv_'+k,v);}
var cfg={voice:lsGet('vn')||'',rate:parseFloat(lsGet('vr')||'1.0'),persona:lsGet('vp')||'',lang:lsGet('vl')||'ru-RU',muted:lsGet('vm')==='1'};

var ws=null,wsOk=false;
var rec=null,recActive=false;
var synth=window.speechSynthesis;
var voices=[];
var ttsUnlocked=false;
var thinkId=null,speaking=false,streamTimer=null,responseTimer=null;

var $chat=document.getElementById('chat');
var $empty=document.getElementById('empty');
var $live=document.getElementById('live');
var $st=document.getElementById('st');
var $orb=document.getElementById('orb');
var $oi=document.getElementById('oi');
var $dot=document.getElementById('dot');
var $mb=document.getElementById('mb');
var $ti=document.getElementById('ti');

function init(){
  document.getElementById('rs').value=cfg.rate;
  document.getElementById('ps').value=cfg.persona;
  document.getElementById('ls').value=cfg.lang;
  updateMuteBtn();
  loadVoices();
  warmUp(connectWS);
  $orb.addEventListener('click',function(e){
    e.preventDefault();
    unlockTTS();
    toggleListen();
  });
  $ti.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();unlockTTS();sendText();}
  });
  document.getElementById('sb').addEventListener('click',function(){unlockTTS();});
}

// ── iOS TTS UNLOCK ───────────────────────────────────────────────────
function unlockTTS(){
  if(ttsUnlocked||!synth)return;
  ttsUnlocked=true;
  var u=new SpeechSynthesisUtterance(' ');
  u.volume=0;u.rate=1;
  synth.speak(u);
  setTimeout(function(){try{synth.cancel();}catch(e){}},200);
}

// ── TEXT RENDERING ───────────────────────────────────────────────────
function renderMsg(raw){
  var t=raw
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  // Markdown links: [label](url)
  t=t.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1 &#8599;</a>');
  // Bare URLs
  t=t.replace(/(^|\\s)(https?:\\/\\/\\S+)/g,
    '$1<a href="$2" target="_blank" rel="noopener">$2 &#8599;</a>');
  // Bold
  t=t.replace(/\\*\\*([^*\
]+)\\*\\*/g,'<strong>$1</strong>');
  // Inline code
  t=t.replace(/`([^`\
]+)`/g,'<code>$1</code>');
  // Line breaks
  t=t.replace(/\
/g,'<br>');
  return t;
}

// ── WARM-UP ──────────────────────────────────────────────────────────
function warmUp(cb){
  setDot('warm');setStatus('сервер просыпается…','wm');
  $orb.className='wm';$oi.textContent='⏳';
  fetch(API+'/api/health',{cache:'no-store'})
    .then(function(){cb();})
    .catch(function(){cb();});
}

// ── WEBSOCKET ────────────────────────────────────────────────────────
function connectWS(){
  try{
    if(ws){ws.onclose=null;try{ws.close();}catch(e){}}
    setDot('');
    ws=new WebSocket(WS_URL);
    ws.onopen=function(){
      wsOk=true;setDot('on');
      $orb.className='';$oi.textContent='🎤';
      setStatus('нажми чтобы говорить');
    };
    ws.onerror=function(){wsOk=false;setDot('err');};
    ws.onclose=function(){wsOk=false;setDot('err');setTimeout(connectWS,5000);};
    ws.onmessage=handleToken;
  }catch(ex){setDot('err');}
}

function handleToken(e){
  var tok=typeof e.data==='string'?e.data:'';
  if(!tok)return;
  clearTimeout(responseTimer);
  if(thinkId){var el=document.getElementById(thinkId);if(el)el.remove();thinkId=null;}
  var wrap=document.getElementById('streaming');
  if(!wrap){wrap=addMsg('a','',{id:'streaming'});}
  var span=wrap.querySelector('.btxt');
  span._raw=(span._raw||'')+tok;
  span.innerHTML=renderMsg(span._raw);
  scrollBot();
  setStatus('получаю…','tk');
  clearTimeout(streamTimer);
  streamTimer=setTimeout(function(){
    var el=document.getElementById('streaming');
    if(el){
      var t=el.querySelector('.btxt')._raw||'';
      el.removeAttribute('id');
      if(t){
        pushHistory('a',t);
        setStatus('нажми чтобы говорить');resetOrb();speak(t);
      }
    }
  },800);
}

function sendToAgent(text){
  if(!text)return;
  addMsg('u',text);
  pushHistory('u',text);
  var msg=buildMsg(text);
  thinkId='tk'+Date.now();addThink(thinkId);
  setStatus('думаю…','tk');$orb.className='tk';$oi.textContent='💬';
  responseTimer=setTimeout(function(){fallbackRest(msg);},TIMEOUT_MS);
  var payload=JSON.stringify({message:msg,service_tokens:{}});
  if(wsOk&&ws&&ws.readyState===1){
    try{ws.send(payload);}catch(ex){clearTimeout(responseTimer);fallbackRest(msg);}
  }else{clearTimeout(responseTimer);fallbackRest(msg);}
}

// ── REST FALLBACK ─────────────────────────────────────────────────────
function fallbackRest(msg){
  clearTimeout(responseTimer);
  if(thinkId){var el=document.getElementById(thinkId);if(el)el.remove();thinkId=null;}
  var ftk='ftk'+Date.now();addThink(ftk);setStatus('через HTTP…','tk');
  fetch(API+'/think',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:msg})
  })
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(d){
    var el=document.getElementById(ftk);if(el)el.remove();
    var reply=d.response||d.message||d.text||'';
    if(!reply)throw new Error('empty');
    pushHistory('a',reply);
    addMsg('a',reply);setStatus('нажми чтобы говорить');resetOrb();speak(reply);
  })
  .catch(function(err){
    var el=document.getElementById(ftk);if(el)el.remove();
    addMsg('a','Нет ответа ('+err.message+'). Попробуй ещё раз.',{cls:'err'});
    setStatus('ошибка','er');$orb.className='er';$oi.textContent='⚠️';
    setTimeout(resetOrb,3000);
  });
}

// ── SPEECH RECOGNITION ──────────────────────────────────────────────
function toggleListen(){
  if(speaking){synth.cancel();speaking=false;}
  if(recActive){stopRec();}else{startRec();}
}
function startRec(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){setStatus('Микрофон не поддерживается','er');$ti.focus();return;}
  recActive=true;$orb.className='ls';$oi.textContent='🔴';setStatus('слушаю…','ls');
  rec=new SR();rec.continuous=false;rec.interimResults=true;rec.lang=cfg.lang;
  rec.onresult=function(e){
    var interim='',final='';
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal)final+=e.results[i][0].transcript;
      else interim+=e.results[i][0].transcript;
    }
    showLive(final||interim);
    if(final){hideLive();stopRec(true);sendToAgent(final.trim());}
  };
  rec.onerror=function(e){
    hideLive();recActive=false;
    var msg=e.error==='not-allowed'?'Нет доступа к микрофону':
             e.error==='no-speech'?'Не услышал — попробуй':'Ошибка: '+e.error;
    setStatus(msg,'er');resetOrb();setTimeout(function(){setStatus('нажми чтобы говорить');},2500);
  };
  rec.onend=function(){if(recActive){recActive=false;resetOrb();}};
  try{rec.start();}catch(ex){recActive=false;setStatus('Не удалось запустить микрофон','er');resetOrb();}
}
function stopRec(silent){recActive=false;if(rec){try{rec.stop();}catch(ex){}rec=null;}if(!silent)resetOrb();}

// ── TTS ──────────────────────────────────────────────────────────────
function loadVoices(){
  function load(){
    voices=synth.getVoices();
    var sel=document.getElementById('vs');
    sel.innerHTML='<option value="">Авто</option>';
    voices.forEach(function(v){
      var o=document.createElement('option');
      o.value=v.name;
      o.textContent=v.name+' ('+v.lang+')';
      if(v.name===cfg.voice)o.selected=true;
      sel.appendChild(o);
    });
  }
  load();
  if(synth.onvoiceschanged!==undefined)synth.onvoiceschanged=load;
}

function speak(text){
  if(cfg.muted||!text)return;
  setStatus('говорю…','sp');$orb.className='sp';$oi.textContent='🔊';speaking=true;
  synth.cancel();
  var clean=text
    .replace(/\\[([^\\]]+)\\]\\([^)]+\\)/g,'$1')
    .replace(/https?:\\/\\/\\S+/g,'')
    .replace(/[*_~#>`]/g,'')
    .replace(/\\s+/g,' ')
    .trim();
  var chunks=[];
  var sents=clean.match(/[^.!?]+[.!?]*/g)||[clean];
  var cur='';
  sents.forEach(function(s){
    if((cur+s).length>160&&cur){chunks.push(cur.trim());cur=s;}else cur+=s;
  });
  if(cur.trim())chunks.push(cur.trim());
  chunks=chunks.filter(Boolean);
  var i=0;
  function next(){
    if(!speaking||i>=chunks.length){speaking=false;resetOrb();return;}
    var u=new SpeechSynthesisUtterance(chunks[i++]);
    u.rate=cfg.rate;u.pitch=1.0;
    if(cfg.voice){var vx=voices.find(function(v){return v.name===cfg.voice;});if(vx)u.voice=vx;}
    u.onend=next;u.onerror=next;
    synth.speak(u);
  }
  next();
}

// ── UI HELPERS ───────────────────────────────────────────────────────
function addMsg(role,text,opts){
  if($empty)$empty.style.display='none';
  var wrap=document.createElement('div');
  wrap.className='msg '+role+(opts&&opts.cls?' '+opts.cls:'');
  if(opts&&opts.id)wrap.id=opts.id;
  var bbl=document.createElement('div');bbl.className='bbl';
  var span=document.createElement('span');span.className='btxt';
  if(text){span._raw=text;span.innerHTML=renderMsg(text);}
  bbl.appendChild(span);
  var ts=document.createElement('div');ts.className='ts';
  ts.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  wrap.appendChild(bbl);wrap.appendChild(ts);
  $chat.appendChild(wrap);scrollBot();return wrap;
}
function addThink(id){
  var w=document.createElement('div');w.className='msg a';w.id=id;
  w.innerHTML='<div class="bbl"><div class="dots"><span></span><span></span><span></span></div></div>';
  $chat.appendChild(w);scrollBot();
}
function scrollBot(){$chat.scrollTop=$chat.scrollHeight;}
function setStatus(t,cls){$st.textContent=t;$st.className=cls||'';}
function setDot(cls){$dot.className=cls;}
function showLive(t){$live.textContent=t;$live.className='on';}
function hideLive(){$live.textContent='';$live.className='';}
function resetOrb(){
  if(!thinkId&&!speaking){
    $orb.className='';$oi.textContent='🎤';
    setStatus('нажми чтобы говорить');
  }
}
window.sendText=function(){
  var v=$ti.value.trim();if(!v)return;$ti.value='';
  if(speaking){synth.cancel();speaking=false;}
  sendToAgent(v);
};
window.toggleMute=function(){
  cfg.muted=!cfg.muted;lsSet('vm',cfg.muted?'1':'0');
  if(cfg.muted){synth.cancel();speaking=false;resetOrb();}
  updateMuteBtn();
};
function updateMuteBtn(){
  $mb.textContent=cfg.muted?'🔇 без звука':'🔊 звук';
}
window.clearChat=function(){
  clearTimeout(streamTimer);clearTimeout(responseTimer);
  if(rec){try{rec.stop();}catch(e){}}recActive=false;
  synth.cancel();speaking=false;
  chatHistory=[];
  $chat.innerHTML='';$chat.appendChild($empty);$empty.style.display='';
  setStatus('нажми чтобы говорить');resetOrb();
};
window.openSettings=function(){document.getElementById('sp').classList.add('open');};
window.closeSettings=function(){document.getElementById('sp').classList.remove('open');};
window.saveCfg=function(){
  cfg.voice=document.getElementById('vs').value;
  cfg.rate=parseFloat(document.getElementById('rs').value);
  cfg.persona=document.getElementById('ps').value;
  cfg.lang=document.getElementById('ls').value;
  lsSet('vn',cfg.voice);lsSet('vr',cfg.rate);lsSet('vp',cfg.persona);lsSet('vl',cfg.lang);
};
document.body.addEventListener('touchmove',function(e){
  if(!e.target.closest('#chat'))e.preventDefault();
},{passive:false});
window.addEventListener('load',init);
})();
