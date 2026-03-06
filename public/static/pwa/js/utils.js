// SMERTCH Utils - Helper functions


// ── UTILS ───────────────────────────────────────────────────────────────────
const f$=v=>{if(!v||isNaN(v))return'–';if(v>=1e9)return'$'+(v/1e9).toFixed(2)+'B';if(v>=1e6)return'$'+(v/1e6).toFixed(2)+'M';if(v>=1e3)return'$'+(v/1e3).toFixed(1)+'K';return v>=0.01?'$'+v.toFixed(4):'$'+v.toExponential(2)};
const fAge=ms=>{const m=Math.floor(ms/60000);return m<60?m+'m':m<1440?Math.floor(m/60)+'h':Math.floor(m/1440)+'d'};
const clr=v=>v>0?'pos':v<0?'neg':'neu';
const cs=v=>v>0?'+'+v.toFixed(1)+'%':v.toFixed(1)+'%';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const scroll=()=>{const c=document.getElementById('chat');requestAnimationFrame(()=>c.scrollTop=c.scrollHeight)};


// ── KILL ─────────────────────────────────────────────────────────────────────
function toggleKill(){
  killed=!killed;
  const b=document.getElementById('killBtn'),d=document.getElementById('dot');
  b.classList.toggle('on',killed); b.textContent=killed?'☠ KILLED':'☠';
  d.classList.toggle('dead',killed);
  if(killed){clearInterval(tgPushTimer);botMsg('☠️ Kill Switch — всё остановлено.');}
  else{startAutoLoops();botMsg('✅ Возобновляю.');}
}
