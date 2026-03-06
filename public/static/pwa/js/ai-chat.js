// SMERTCH AI Chat - AI interaction and command routing


// ── AI CHAT ───────────────────────────────────────────────────────────────────

// ── AI CHAT ───────────────────────────────────────────────────────────────────
async function askAI(question){
  const portCtx=portfolio.length?\`\nПортфель: \${portfolio.map(p=>esc(p.sym)||p.addr?.slice(0,6)||'?').join(', ')}.\`:'';
  const ctx=lastTokenCtx?'\n\n'+lastTokenCtx:'';
  const prompt=\`\${question}\${portCtx}\${ctx}\`;
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

// ── AI WARM-UP ─────────────────────────────────────────────────────────────────
async function warmupApi(){
  try{await fetch('https://godlocal-api.onrender.com/api/health',{signal:AbortSignal.timeout(8000)});}catch(e){}
}


// ── COMMAND ROUTER ────────────────────────────────────────────────────────────
const SOL_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function cmd(text){
  text=text.trim();
  const tl=text.toLowerCase();
  if(SOL_RE.test(text)){await runAnalyze(text);return;}
  const am=text.match(/^анализ\\s+([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  if(am){await runAnalyze(am[1]);return;}
  // entry: "вход SYM price sol"
  const em=tl.match(/^вход\\s+(\\S+)\\s+([\\d.]+)\\s*([\\d.]*)/);
  if(em){
    const sym=em[1].toUpperCase(),entry=parseFloat(em[2]),sol=parseFloat(em[3])||0;
    const pos=portfolio.find(p=>p.sym?.toUpperCase()===sym);
    if(pos){pos.entry=entry;if(sol)pos.sol=sol;localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));botMsg(\`✅ \${esc(sym)} обновлён: вход \${f$(entry)}\${sol?' · '+sol+' SOL':''}\`);}
    else{portfolio.push({id:Date.now(),addr:'',sym,entry,sol,ts:Date.now()});localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));botMsg(\`✅ \${esc(sym)}: вход \${f$(entry)} · \${sol} SOL\`);}
    return;
  }
  // TG commands
  if(tl==='tg setup'||tl==='телеграм'){await setupTg();return;}
  const tgTok=tl.match(/^tg token\\s+(\\S+)/);
  if(tgTok){localStorage.setItem('gl_telegram',tgTok[1]);document.getElementById('tgDot').className='tg-status on';botMsg('✅ Bot token сохранён');return;}
  const tgChat=tl.match(/^tg chat\\s+(\\S+)/);
  if(tgChat){localStorage.setItem('gl_tg_chat',tgChat[1]);botMsg('✅ Chat ID сохранён. Теперь BUY сигналы пойдут в TG автоматически.');return;}
  // Commands
  if(tl==='скан'||tl==='scan'){await runScan();return;}
  if(tl==='pump'||tl==='pump.fun'){await runPump();return;}
  if(tl==='сигналы'||tl==='signals'){await runSignals();return;}
  if(tl==='баг'||tl==='bag'){await runBag();return;}
  if(tl==='горячие'||tl==='hot'){await runHot();return;}
  if(tl==='помощь'||tl==='help'){
    botMsg(\`📖 <b>Команды</b><br><br>
🌪️ <b>скан</b> — топ токены Solana (с фильтрами)<br>
🔥 <b>pump</b> — pump.fun запуски &lt;10 мин<br>
⚡ <b>сигналы</b> — BUY/SELL<br>
💼 <b>баг</b> — портфель + PnL<br>
🔗 <b>[адрес]</b> — анализ + on-chain holders<br>
➕ <b>вход SYM 0.0001 0.5</b> — добавить позицию<br>
📤 <b>tg setup</b> — настроить Telegram пуш<br>
⚙️ <b>Фильтры</b> — по mcap / ликвидности / возрасту / BUY only<br>
🧠 <b>любой вопрос</b> — AI стратег\`);
    return;
  }
  if(tl==='стратегия'){await askAI('Дай топ-5 правил флиппинга мемкойнов на Solana в 2026. Кратко и по делу.');return;}
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
