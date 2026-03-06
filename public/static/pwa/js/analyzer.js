// SMERTCH Analyzer - Deep token analysis and on-chain holders


// ── DIVE ANALYZER ─────────────────────────────────────────────────────────────
async function runAnalyze(addr){
  addr=addr.trim();
  const t=typing();
  try{
    // Fetch DEX + Holders in parallel
    const [dexRes, holdersRes] = await Promise.all([
      fetch(DEX+'/latest/dex/tokens/'+addr).then(x=>x.json()),
      getSolanaHolders(addr)
    ]);
    const pairs=(dexRes.pairs||[]).filter(p=>p.chainId==='solana');
    rmTyping();
    if(!pairs.length){botMsg('🔍 Токен не найден на Solana. Проверь адрес.');return;}
    const p=pairs[0];
    const sym=p.baseToken?.symbol||'?';
    const mcap=p.fdv||p.marketCap||0,liq=p.liquidity?.usd||0;
    const buys=p.txns?.h24?.buys||0,sells=p.txns?.h24?.sells||0;
    const age=p.pairCreatedAt?Date.now()-p.pairCreatedAt:null;
    const hasTg=!!p.info?.socials?.find(s=>s.type==='telegram');
    const hasTw=!!p.info?.socials?.find(s=>s.type==='twitter');
    const hasSite=!!p.info?.websites?.length;
    // Rug score
    let rug=0;
    if(liq<5000)rug+=30;else if(liq<20000)rug+=12;
    if(!hasTg&&!hasTw&&!hasSite)rug+=22;
    if(age&&age<1800000)rug+=12;
    if(buys<10)rug+=15;if(sells>buys*3)rug+=15;
    if(holdersRes.topHolderPct>20)rug+=20;
    rug=Math.min(100,rug);
    const rugClr=rug>=70?'var(--r)':rug>=40?'var(--y)':'var(--g)';
    const bp=buys+sells>0?Math.round(buys/(buys+sells)*100):50;
    const conv=score(p),st=sigType(conv);
    // Holders HTML
    const holdersHtml=holdersRes.holders.length?\`
      <div class="tc" style="margin-top:5px">
        <div class="sec-lbl" style="margin-bottom:6px">🔗 Топ держатели (on-chain)</div>
        \${holdersRes.holders.map((h,i)=>\`
          <div class="holder-row">
            <div><span class="holder-addr">\${h.addr.slice(0,8)}…\${h.addr.slice(-4)}</span>
            \${h.isTop?\`<span class="dev-flag">⚠️ DEV?</span>\`:''}</div>
            <div class="holder-pct" style="color:\${h.pct>20?'var(--r)':h.pct>10?'var(--y)':'var(--g)'}">\${h.pct.toFixed(1)}%</div>
          </div>\`).join('')}
        \${holdersRes.topHolderPct>20?\`<div style="font-size:11px;color:var(--r);margin-top:5px">⚠️ Топ держатель \${holdersRes.topHolderPct.toFixed(0)}% — высокий риск dump</div>\`:''}
      </div>\`:
      \`<div style="font-size:11px;color:var(--dim);margin-top:5px">Данные о держателях недоступны (RPC timeout)</div>\`;
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">🔍 <b>Анализ \${esc(sym)}</b>
      \${tokenCard(p)}
      <div class="tc" style="margin-top:5px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:11px;color:var(--dim)">🛡 Rug Risk</span>
          <b style="color:\${rugClr}">\${rug}/100 \${rug>=70?'⛔ ВЫСОКИЙ':rug>=40?'⚠️ СРЕДНИЙ':'✅ НИЗКИЙ'}</b>
        </div>
        <div class="rug-bar"><div class="rug-f" style="width:\${rug}%;background:\${rugClr}"></div></div>
        <div style="display:flex;gap:12px;margin-top:7px">
          <span style="font-size:11px">TG \${hasTg?'✅':'❌'}</span>
          <span style="font-size:11px">TW \${hasTw?'✅':'❌'}</span>
          <span style="font-size:11px">Сайт \${hasSite?'✅':'❌'}</span>
          <span style="font-size:11px">Buy% <b style="color:\${bp>55?'var(--g)':'var(--r)'}">\${bp}%</b></span>
        </div>
      </div>
      \${holdersHtml}
    </div>\`;
    document.getElementById('chat').appendChild(d);scroll();
    lastTokenCtx=\`Токен: \${sym} | Mcap: $\${f$(mcap)} | Ликвидность: $\${f$(liq)} | Rug: \${rug}/100 | Buy pressure: \${bp}%\`;
    setTimeout(()=>askAgents(\`🔬 COUNCIL: токен \${sym}\n\n📊 mcap=\$\${f\$(mcap)}, ликвидность=\$\${f\$(liq)}, rug=\${rug}/100, buy pressure=\${bp}%, топ держатель=\${holdersRes.topHolderPct.toFixed(0)}%.\nSocials: TG=\${hasTg?'✅':'❌'} TW=\${hasTw?'✅':'❌'} Сайт=\${hasSite?'✅':'❌'}.\n\nАнализ через совет агентов: Grok — rug-риски и красные флаги, Lucas — нарратив и потенциал x10, Architect — структура рынка и тренд, Rex — есть ли реальные деньги. Стоит флипать?\`),200);
  }catch(e){rmTyping();botMsg('⚠️ '+esc(e.message));}
}


// ── SOLANA ON-CHAIN HOLDERS ────────────────────────────────────────────────────
async function getSolanaHolders(mintAddr){
  try{
    const resp=await fetch(SOL_RPC,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTokenLargestAccounts',params:[mintAddr]})});
    const data=await resp.json();
    const accounts=(data.result?.value||[]);
    if(!accounts.length) return {holders:[],topHolderPct:0};
    // Total supply from first endpoint
    const supplyResp=await fetch(SOL_RPC,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:2,method:'getTokenSupply',params:[mintAddr]})});
    const supplyData=await supplyResp.json();
    const totalSupply=parseFloat(supplyData.result?.value?.uiAmount||0);
    if(!totalSupply) return {holders:[],topHolderPct:0};
    const top5=accounts.slice(0,5).map((a,i)=>{
      const bal=parseFloat(a.uiAmount||0);
      const pct=totalSupply>0?(bal/totalSupply*100):0;
      return {addr:a.address,bal,pct,isTop:i===0&&pct>15};
    });
    return {holders:top5,topHolderPct:top5[0]?.pct||0};
  }catch(e){return {holders:[],topHolderPct:0};}
}
