// SMERTCH Cards - Token and Pump.fun card renderers


// ── TOKEN CARD ────────────────────────────────────────────────────────────────
function tokenCard(p,opts={}){
  const sym=p.baseToken?.symbol||'?',name=p.baseToken?.name||'';
  const price=parseFloat(p.priceUsd||0);
  const c5=parseFloat(p.priceChange?.m5||0),c1=parseFloat(p.priceChange?.h1||0),c6=parseFloat(p.priceChange?.h6||0);
  const vol1=p.volume?.h1||0,vol24=p.volume?.h24||0,mcap=p.fdv||p.marketCap||0,liq=p.liquidity?.usd||0;
  const buys=p.txns?.h24?.buys||0,sells=p.txns?.h24?.sells||0;
  const age=p.pairCreatedAt?Date.now()-p.pairCreatedAt:null;
  const conv=score(p),st=sigType(conv);
  const isNew=age&&age<4*3600000;
  const addr=p.baseToken?.address||'';
  const dexUrl=p.url||'https://dexscreener.com/solana/'+(p.pairAddress||'');
  const bp=buys+sells>0?Math.round(buys/(buys+sells)*100):50;
  const sigClr=st==='buy'?'var(--g)':st==='sell'?'var(--r)':'var(--y)';
  return \`<div class="tc">
    <div class="tc-head">
      <div><div class="sym">\${esc(sym)} <span class="bdg b-\${st}">\${st==='buy'?'🟢 BUY':st==='sell'?'🔴 EXIT':'🟡 WATCH'}</span>\${isNew?'<span class="bdg b-new">NEW</span>':''}</div>
      <div class="tk-name">\${esc(name)}</div></div>
      <div class="price-a"><div class="price">\${f$(price)}</div><div class="chg \${clr(c1)}">\${cs(c1)} 1h</div></div>
    </div>
    <div class="stats">
      <div class="s"><div class="sl">MCap</div><div class="sv">\${f$(mcap)}</div></div>
      <div class="s"><div class="sl">Vol 1h</div><div class="sv">\${f$(vol1)}</div></div>
      <div class="s"><div class="sl">Ликв.</div><div class="sv">\${f$(liq)}</div></div>
      <div class="s"><div class="sl">B/S</div><div class="sv" style="color:\${bp>55?'var(--g)':'var(--r)'}">\${buys}/\${sells}</div></div>
      \${age?\`<div class="s"><div class="sl">Возраст</div><div class="sv">\${fAge(age)}</div></div>\`:''}
      <div class="s"><div class="sl">5m</div><div class="sv chg \${clr(c5)}">\${cs(c5)}</div></div>
    </div>
    <div class="conv"><div class="conv-f" style="width:\${conv}%;background:\${sigClr}"></div></div>
    <div class="cbs">
      <button class="cb cb-g" onclick="quickBuyNow('\${esc(addr)}','\${esc(sym)}')">⚡ Купить</button>
      <button class="cb cb-p" onclick="cmd('анализ \${esc(addr)}')">Анализ</button>
      \${opts.pushTg?\`<button class="cb cb-o" onclick="pushOneTg('\${esc(sym)}','\${esc(addr)}',\${c1},\${vol1},\${liq},\${buys},\${sells},\${age||0})">📤 TG</button>\`:''}
      <a href="\${dexUrl}" target="_blank" style="text-decoration:none"><button class="cb cb-p">DEX ↗</button></a>
      \${opts.closeBtn!==undefined?\`<button class="cb cb-r" onclick="closePos(\${opts.closeBtn})">Закрыть</button>\`:''}
    </div>
  </div>\`;
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
