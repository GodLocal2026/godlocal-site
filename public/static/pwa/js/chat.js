// SMERTCH Chat - UI bubble helpers


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
