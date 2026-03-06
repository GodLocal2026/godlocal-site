// SMERTCH App - Initialization, auto-loops, startup


// ── AUTO LOOPS ────────────────────────────────────────────────────────────────
function startAutoLoops(){
  clearInterval(tgPushTimer);
  tgPushTimer=setInterval(()=>{if(!killed)runScan();},120000);
}


// ── INIT ──────────────────────────────────────────────────────────────────────
(function init(){
  if(getTg().ok) document.getElementById('tgDot').className='tg-status on';
  botMsg(\`👋 <b>SMERTCH v3</b> — X100 мемкойн флиппер<br>
<span style="font-size:12px;color:var(--dim)">pump.fun · on-chain holders · авто TG пуш · фильтры</span><br><br>
\${getTg().ok?'📤 TG пуш: <span style="color:var(--g)">активен</span>':'📤 TG пуш: <span style="color:var(--dim)">настрой → tg setup</span>'}\`);
  setTimeout(()=>runScan(),700);
  startAutoLoops();
})();




// ── STARTUP ───────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  botMsg('⚡ <b>SMERTCH WOLF v3.1</b> — Solana AI terminal.<br>Нажми <b>🌪️ Скан</b> для анализа рынка или введи токен/адрес.');
  warmupApi();
  setTimeout(() => runScan(), 1500);
});