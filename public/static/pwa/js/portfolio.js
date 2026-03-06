// SMERTCH Portfolio - Position tracking and quick buy/sell


// ── PORTFOLIO ────────────────────────────────────────────────────────────────
async function runBag(){
  if(!portfolio.length){botMsg('💼 Портфель пуст. Нажми <b>+Войти</b> на токене.');return;}
  const t=typing();
  try{
    const addrs=[...new Set(portfolio.map(p=>p.addr))].filter(Boolean);
    let pm={};
    if(addrs.length){const r=await fetch(DEX+'/latest/dex/tokens/'+addrs.join(',')).then(x=>x.json());for(const p of (r.pairs||[])){const a=p.baseToken?.address;if(a)pm[a]={price:parseFloat(p.priceUsd||0),sym:p.baseToken?.symbol||'?'};}}
    rmTyping();
    let tot=0,cnt=0;
    const rows=portfolio.map((pos,i)=>{
      const cur=pm[pos.addr]?.price||0;
      const sym=pm[pos.addr]?.sym||pos.sym||pos.addr?.slice(0,6)||'?';
      const pnl=pos.entry>0?(cur-pos.entry)/pos.entry*100:0;
      tot+=pnl;cnt++;
      return \`<div class="prow"><div><b>\${esc(sym)}</b><br><span style="font-size:10px;color:var(--dim)">Вход: \${pos.entry>0?f$(pos.entry):'?'} · \${pos.sol||0} SOL · \${fAge(Date.now()-pos.ts)}</span></div>
      <div style="text-align:right"><div class="\${pnl>=0?'pnl-p':'pnl-n'}">\${pnl>=0?'+':''}\${pnl.toFixed(1)}%</div>
      <div style="font-size:10px;color:var(--dim)">\${cur>0?f$(cur):'–'}</div>
      <button class="cb cb-r" style="font-size:9px;margin-top:3px" onclick="closePos(\${i})">Закрыть</button></div></div>\`;
    }).join('');
    const avg=cnt?tot/cnt:0;
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=\`<div class="bbl ai">💼 <b>Портфель</b> · avg <span class="\${avg>=0?'pnl-p':'pnl-n'}">\${avg>=0?'+':''}\${avg.toFixed(1)}%</span>\${rows}</div>\`;
    document.getElementById('chat').appendChild(d);scroll();
  }catch(e){rmTyping();botMsg('⚠️ '+esc(e.message));}
}

async function quickEnter(addr,sym){
  portfolio.push({id:Date.now(),addr,sym,entry:0,sol:0,ts:Date.now()});
  localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));
  botMsg(\`✅ <b>\${esc(sym)}</b> в портфеле. Введи: <i>вход \${esc(sym)} 0.000001 0.5</i> — для цены входа и размера\`);
}
async function closePos(i){
  const sym=portfolio[i]?.sym||'токен';
  portfolio.splice(i,1);
  localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));
  botMsg(\`❌ Позиция <b>\${esc(sym)}</b> закрыта\`);
}

// ── QUICK BUY / SELL ───────────────────────────────────────────────────────────
let qkSol = 0.1; // preset SOL amount for quick buy

function setQkSol(amt, el) {
  qkSol = amt;
  document.querySelectorAll('.qk-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function quickBuyNow(mint, sym) {
  if(!phantomPubkey) { await connectPhantom(); if(!phantomPubkey) return; }
  botMsg(\`⚡ Покупка <b>\${esc(sym)}</b> за \${qkSol} SOL…\`);
  try {
    const lamports = Math.round(qkSol * 1e9);
    const q = await fetch(\`https://quote-api.jup.ag/v6/quote?inputMint=\${WSOL_MINT}&outputMint=\${mint}&amount=\${lamports}&slippageBps=300\`)
      .then(r => { if(!r.ok) throw new Error('Jupiter quote ' + r.status); return r.json(); });
    if(q.error) throw new Error(q.error);
    const swapR = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ quoteResponse:q, userPublicKey:phantomPubkey, wrapAndUnwrapSol:true, dynamicComputeUnitLimit:true, prioritizationFeeLamports:'auto' })
    });
    if(!swapR.ok) throw new Error('Jupiter swap ' + swapR.status);
    const { swapTransaction } = await swapR.json();
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
    botMsg('✍️ Подпиши в Phantom…');
    const phantom = window.solana || window.phantom?.solana;
    const { signature } = await phantom.signAndSendTransaction({ serialize: () => txBuf });
    const outAmt = (parseInt(q.outAmount) / 1e6).toLocaleString('en-US', {maximumFractionDigits:2});
    botMsg(\`✅ <b>Куплено \${esc(sym)}</b> × \${outAmt}<br><a href="https://solscan.io/tx/\${signature}" target="_blank" style="color:var(--b)">\${signature.slice(0,16)}…</a>\`);
    portfolio.push({id:Date.now(),addr:mint,sym,entry:qkSol,sol:qkSol,ts:Date.now()});
    localStorage.setItem('gl_portfolio',JSON.stringify(portfolio));
    setTimeout(refreshWallet, 5000);
  } catch(e) { botMsg('⚠️ ' + e.message); }
}

async function quickSellNow(mint, sym, amt, dec) {
  if(!phantomPubkey) { await connectPhantom(); if(!phantomPubkey) return; }
  botMsg(\`⚡ Продажа <b>\${esc(sym)}</b>…\`);
  try {
    const lamports = Math.round(amt * Math.pow(10, dec||6));
    const q = await fetch(\`https://quote-api.jup.ag/v6/quote?inputMint=\${mint}&outputMint=\${WSOL_MINT}&amount=\${lamports}&slippageBps=300\`)
      .then(r => { if(!r.ok) throw new Error('Jupiter quote ' + r.status); return r.json(); });
    if(q.error) throw new Error(q.error);
    const swapR = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ quoteResponse:q, userPublicKey:phantomPubkey, wrapAndUnwrapSol:true, dynamicComputeUnitLimit:true, prioritizationFeeLamports:'auto' })
    });
    if(!swapR.ok) throw new Error('Jupiter swap ' + swapR.status);
    const { swapTransaction } = await swapR.json();
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
    botMsg('✍️ Подпиши продажу в Phantom…');
    const phantom = window.solana || window.phantom?.solana;
    const { signature } = await phantom.signAndSendTransaction({ serialize: () => txBuf });
    const solReceived = (parseInt(q.outAmount) / 1e9).toFixed(4);
    botMsg(\`✅ <b>Продано \${esc(sym)}</b>, получено ~\${solReceived} SOL<br><a href="https://solscan.io/tx/\${signature}" target="_blank" style="color:var(--b)">\${signature.slice(0,16)}…</a>\`);
    const {ok} = getTg();
    if(ok) sendTg(\`🔴 ПРОДАНО: \${sym}\\nПолучено: ~\${solReceived} SOL\\nhttps://dexscreener.com/solana/\${mint}\`);
    setTimeout(refreshWallet, 5000);
  } catch(e) { botMsg('⚠️ ' + e.message); }
}

