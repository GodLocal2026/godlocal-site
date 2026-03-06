// SMERTCH Voice - Voice input recognition


// ── VOICE INPUT ───────────────────────────────────────────────────────────────
let voiceRec=null,voiceActive=false;
function toggleVoice(){
  const btn=document.getElementById('micBtn');
  if(voiceActive){stopVoice();return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){botMsg('⚠️ Голосовой ввод не поддерживается в этом браузере');return;}
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
  voiceRec.onerror=(e)=>{voiceActive=false;btn.classList.remove('listening');if(e.error!=='aborted')botMsg('⚠️ Микрофон: '+e.error);};
  voiceRec.start();
}
function stopVoice(){if(voiceRec){voiceRec.stop();voiceRec=null;}}
