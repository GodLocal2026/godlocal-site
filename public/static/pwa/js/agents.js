// SMERTCH Agents - Multi-agent Oasis mode


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
    ? '🤖 <b>Oasis Council включён</b> — GodLocal + 2 архетипа (Architect/Builder/Grok/Lucas/Harper/Benjamin). После анализа токена агенты видят его контекст.'
    : '💬 Wolf AI (обычный чат).'
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
            const synthEl = agentBubble('\\uD83D\\uDD2E Синтез', '');
            const body = synthEl.querySelector('.agent-body');
            if(body) body.innerHTML = '<b>\\u2696\\uFE0F Итог совета:</b><br>' + stripFuncTags(d.v).replace(/</g,'&lt;').replace(/\\n/g,'<br>').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>');
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
