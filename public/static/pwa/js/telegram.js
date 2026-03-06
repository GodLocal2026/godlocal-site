// SMERTCH Telegram - Push notifications to Telegram


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
  return \`🔥 <b>\${sym}</b> · Solana\\n⏱ \${fAge(ageMs)} · \${dir} <b>\${tg}\${c1h.toFixed(1)}%</b>\\nVol 1ч: <b>\${f$(vol1h)}</b> · Liq: <b>\${f$(liq)}</b>\\nB/S: <b>\${buys}B / \${sells}S</b>\\n🔗 \${dexUrl}\`;
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
  if(!ok){botMsg('📤 Настрой Telegram: введи <b>tg setup</b>');return;}
  const msg=fmtTgMsg(sym,addr,c1h,vol1h,liq,buys,sells,ageMs);
  const sent=await sendTg(msg);
  botMsg(sent?\`✅ Отправлено в TG: <b>\${esc(sym)}</b>\`:\`⚠️ Ошибка отправки в TG\`);
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
  botMsg(\`📬 <b>Настройка Telegram пуша</b><br><br>
1. Создай бота: <a href="https://t.me/BotFather" target="_blank" style="color:var(--b)">@BotFather</a> → /newbot<br>
2. Добавь бота в канал <b>X100Agent</b> как администратора<br>
3. Введи: <i>tg token YOUR_BOT_TOKEN</i><br>
4. Введи: <i>tg chat @X100Agent</i> (или ID чата)<br><br>
Текущий статус: \${getTg().ok?'✅ Настроен':'❌ Не настроен'}\`);
}
