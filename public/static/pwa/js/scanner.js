// SMERTCH Scanner - Market scanning, Pump.fun, signals, hot tokens


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
    if(!filtered.length){botMsg(\`🌪️ Скан: <b>\${all.length}</b> токенов, но фильтры скрывают все результаты. Сброс фильтров?\`);return;}
    document.getElementById('tkr').textContent=all.slice(0,5).map(p=>\`\${p.baseToken?.symbol} \${parseFloat(p.priceChange?.h1||0)>0?'▲':'▼'}\${Math.abs(parseFloat(p.priceChange?.h1||0)).toFixed(0)}%\`).join(' · ');
    const d=document.createElement('div');d.className='msg';
    const top=filtered.slice(0,5);
    d.innerHTML=\`<div class="bbl ai">🌪️ <b>Скан \${new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}</b> — \${filtered.length}/\${all.length} токенов\${flt.mcap||flt.liq||flt.age||flt.sig!=='all'?' <span style="color:var(--y);font-size:11px">⚙ фильтр активен</span>':''}<br>\${top.map(p=>tokenCard(p,{pushTg:true})).join('')}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
    // Auto-push BUY signals to TG
    const buySigs=filtered.filter(p=>sigType(score(p))==='buy'&&!pushed.has(p.baseToken?.address||''));
    if(buySigs.length) autoTgPush(buySigs);
  }catch(e){rmTyping();botMsg('⚠️ Ошибка скана: '+esc(e.message));}
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
      <div class="price-a"><div style="font-size:11px;color:var(--o)">\${f$(mcap)}</div><div style="font-size:10px;color:var(--dim)">\${fAge(ageMs)} назад</div></div>
    </div>
    <div style="font-size:10px;color:var(--dim);margin-bottom:3px">Bonding curve: \${progress}% до листинга</div>
    <div class="bond-bar"><div class="bond-fill" style="width:\${progress}%"></div></div>
    <div class="cbs">
      <button class="cb cb-g" onclick="quickEnter('\${addr}','\${sym}')">+Войти</button>
      <button class="cb cb-p" onclick="cmd('анализ \${addr}')">Анализ</button>
      <a href="\${url}" target="_blank" style="text-decoration:none"><button class="cb cb-o">pump.fun ↗</button></a>
    </div>
  </div>\`;
}


// ── PUMP.FUN ─────────────────────────────────────────────────────────────────
async function runPump(){
  if(killed) return;
  const t=typing();
  try{
    const now=Date.now();
    const r=await fetch(PUMP+'/coins?offset=0&limit=50&sort=created_timestamp&order=DESC&includeNsfw=false').then(x=>x.json());
    rmTyping();
    if(!r||!Array.isArray(r)){botMsg('⚠️ pump.fun API не ответил. Попробуй через VPN или используй DEX скан.');return;}
    const fresh=r.filter(c=>c.created_timestamp&&(now-c.created_timestamp)<10*60000&&!c.complete);
    pumpCache=fresh;
    if(!fresh.length){botMsg('🔥 <b>pump.fun</b>: нет новых токенов за последние 10 минут.');return;}
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">🔥 <b>pump.fun — новые запуски &lt;10 мин</b> (\${fresh.length} токенов)\${fresh.slice(0,6).map(c=>pumpCard(c)).join('')}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
  }catch(e){
    rmTyping();
    botMsg('⚠️ pump.fun: CORS или API недоступен. <br><span style="font-size:11px;color:var(--dim)">Попробуй через <a href="https://pump.fun" target="_blank" style="color:var(--o)">pump.fun ↗</a> напрямую</span>');
  }
}


// ── SIGNALS ─────────────────────────────────────────────────────────────────
async function runSignals(){
  if(!scanCache.length){await runScan();return;}
  const filtered=applyFilters(scanCache);
  const buys=filtered.filter(p=>sigType(score(p))==='buy').slice(0,4);
  const sells=filtered.filter(p=>sigType(score(p))==='sell').slice(0,2);
  if(!buys.length&&!sells.length){botMsg('Нет чётких сигналов. Нажми 🌪️ Скан для обновления.');return;}
  const d=document.createElement('div');d.className='msg';
  let html='';
  if(buys.length) html+=\`<div class="sec-lbl" style="color:var(--g)">🟢 ПОКУПАЙ СЕЙЧАС</div>\${buys.map(p=>tokenCard(p,{pushTg:true})).join('')}\`;
  if(sells.length) html+=\`<div class="sec-lbl" style="color:var(--r);margin-top:8px">🔴 ФИКСИРУЙ</div>\${sells.map(p=>tokenCard(p)).join('')}\`;
  d.innerHTML=\`<div class="bbl ai">⚡ <b>Сигналы</b>\${html}</div>\`;
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
    if(!pairs.length){botMsg('Нет горячих токенов');return;}
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">🔥 <b>Горячие</b> (буст + тренд)\${pairs.slice(0,5).map(p=>tokenCard(p,{pushTg:true})).join('')}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
  }catch(e){rmTyping();botMsg('⚠️ '+esc(e.message));}
}
