// SMERTCH Wallet - Phantom wallet and Jupiter swap


// ══ PHANTOM WALLET MODULE ═══════════════════════════════════════════════════════
let phantomPubkey = null;
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
let solPrice = 0;
let swapMode = 'buy'; // buy = SOL→TOKEN, sell = TOKEN→SOL
let quoteTimer = null;

async function connectPhantom(){
  const phantom = window.solana || window.phantom?.solana;
  if(!phantom || !phantom.isPhantom){
    const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if(isMobile){
      const u=encodeURIComponent(window.location.href);
      botMsg('📱 Открываем в Phantom app...');
      setTimeout(()=>{window.location.href='https://phantom.app/ul/browse/'+u+'?ref='+u;},300);
    }else{
      botMsg('👻 Phantom не найден. Установи расширение на десктопе.');
    };
    return;
  }
  try{
    const resp = await phantom.connect();
    phantomPubkey = resp.publicKey.toString();
    document.getElementById('walletDisconnected').style.display = 'none';
    document.getElementById('walletConnected').style.display = 'block';
    document.getElementById('walletAddr').textContent = phantomPubkey.slice(0,6) + '...' + phantomPubkey.slice(-4) + ' 📋';
    document.getElementById('walletAddr').onclick = () => {navigator.clipboard.writeText(phantomPubkey); document.getElementById('walletAddr').textContent = '✅ Скопировано!'; setTimeout(() => document.getElementById('walletAddr').textContent = phantomPubkey.slice(0,6)+'...'+phantomPubkey.slice(-4)+' 📋', 1500);};
    refreshWallet();
  }catch(e){
    botMsg('⚠️ Ошибка подключения: ' + e.message);
  }
}

async function refreshWallet(){
  if(!phantomPubkey) return;
  // SOL balance
  try{
    const r = await fetch(SOL_RPC, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[phantomPubkey]})
    });
    const d = await r.json();
    const sol = (d.result?.value || 0) / 1e9;
    document.getElementById('solBal').textContent = sol.toFixed(4) + ' SOL';
    // Get SOL price
    const pr = await fetch(COINGECKO + '/simple/price?ids=solana&vs_currencies=usd');
    const pd = await pr.json();
    solPrice = pd.solana?.usd || 0;
    document.getElementById('solUsd').textContent = '$' + (sol * solPrice).toFixed(2);
  }catch(e){}
  // SPL token accounts
  loadTokenAccounts();
}

async function loadTokenAccounts(){
  if(!phantomPubkey) return;
  try{
    const r = await fetch(SOL_RPC, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        jsonrpc:'2.0', id:1, method:'getTokenAccountsByOwner',
        params:[phantomPubkey,
          {programId:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'},
          {encoding:'jsonParsed', commitment:'confirmed'}
        ]
      })
    });
    const d = await r.json();
    const accounts = (d.result?.value || [])
      .map(a => a.account.data.parsed.info)
      .filter(a => a.tokenAmount.uiAmount > 0)
      .sort((a,b) => b.tokenAmount.uiAmount - a.tokenAmount.uiAmount)
      .slice(0, 20);

    const list = document.getElementById('tokenList');
    if(!accounts.length){ list.innerHTML='<div style="color:var(--dim);font-size:12px;text-align:center;padding:16px">Нет токенов в кошельке</div>'; return; }
    list.innerHTML = accounts.map(a => {
      const mint = a.mint;
      const amt = a.tokenAmount.uiAmount;
      const short = mint.slice(0,4)+'...'+mint.slice(-4);
      return \`<div class="tok-row" style="cursor:default">
        <div style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer" onclick="fillSwapAddr('\${mint}')">
          <div class="tok-ico">🪙</div>
          <div class="tok-info">
            <div class="tok-sym">\${short}</div>
            <div class="tok-amt">Bal: \${amt.toLocaleString('en-US',{maximumFractionDigits:4})}</div>
          </div>
        </div>
        <button class="cb cb-r" style="font-size:10px;padding:3px 10px;flex-shrink:0" onclick="quickSellNow('\${mint}','\${short}',\${amt},6)">💰 Продать</button>
      </div>\`;
    }).join('');
  }catch(e){}
}

async function fillSwapAddr(mint){
  document.getElementById('swapToAddr').value = mint;
  document.getElementById('swapToLabel').textContent = mint.slice(0,4)+'...';
  debounceQuote();
}

async function setSwapMode(mode){
  swapMode = mode;
  document.getElementById('swapTabBuy').classList.toggle('active', mode==='buy');
  document.getElementById('swapTabSell').classList.toggle('active', mode==='sell');
  document.getElementById('swapFromLabel').textContent = mode==='buy' ? 'SOL' : 'TOKEN';
  document.getElementById('swapAmt').placeholder = mode==='buy' ? 'Кол-во SOL' : 'Кол-во токенов';
  document.getElementById('swapQuote').textContent = '';
}

async function debounceQuote(){
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(getSwapQuote, 600);
}

async function getSwapQuote(){
  const amt = parseFloat(document.getElementById('swapAmt').value);
  const toAddr = document.getElementById('swapToAddr').value.trim();
  if(!amt || !toAddr) return;
  const quoteEl = document.getElementById('swapQuote');
  quoteEl.textContent = '⏳ Получаю котировку…';
  try{
    const inputMint = swapMode==='buy' ? WSOL_MINT : toAddr;
    const outputMint = swapMode==='buy' ? toAddr : WSOL_MINT;
    const decimals = swapMode==='buy' ? 9 : 6;
    const amtLamports = Math.round(amt * Math.pow(10, decimals));
    const url = \`https://quote-api.jup.ag/v6/quote?inputMint=\${inputMint}&outputMint=\${outputMint}&amount=\${amtLamports}&slippageBps=300\`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('Jupiter API ' + r.status);
    const q = await r.json();
    if(q.error) throw new Error(q.error);
    const outAmt = parseInt(q.outAmount);
    const outDecimals = swapMode==='buy' ? 6 : 9;
    const outFmt = (outAmt / Math.pow(10, outDecimals)).toFixed(swapMode==='buy'?4:6);
    const priceImpact = parseFloat(q.priceImpactPct || 0);
    const impactColor = priceImpact > 5 ? '#ff4d6d' : priceImpact > 2 ? '#FDCB6E' : '#00FF9D';
    quoteEl.innerHTML = \`Получишь ≈ <b>\${outFmt}</b> | Проскальзывание: <span style="color:\${impactColor}">\${priceImpact.toFixed(2)}%</span>\`;
    quoteEl.dataset.quote = JSON.stringify(q);
  }catch(e){
    quoteEl.textContent = '⚠️ ' + e.message;
  }
}

async function execSwap(){
  if(!phantomPubkey){ botMsg('👻 Сначала подключи Phantom кошелёк'); switchTab('wallet'); return; }
  const quoteEl = document.getElementById('swapQuote');
  const quoteData = quoteEl.dataset.quote;
  if(!quoteData){ botMsg('⚠️ Сначала получи котировку'); return; }
  const btn = document.getElementById('swapBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Подготовка транзакции…';
  try{
    const q = JSON.parse(quoteData);
    // Get swap transaction from Jupiter
    const swapResp = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        quoteResponse: q,
        userPublicKey: phantomPubkey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    if(!swapResp.ok) throw new Error('Jupiter swap API ' + swapResp.status);
    const { swapTransaction } = await swapResp.json();
    // Decode + sign with Phantom
    btn.textContent = '✍️ Подпиши в Phantom…';
    const phantom = window.solana || window.phantom?.solana;
    const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
    const signed = await phantom.signTransaction({
      serialize: () => txBuf,
      deserialize: (b) => b
    });
    // Actually use signAndSendTransaction for simplicity
    btn.textContent = '📡 Отправка…';
    const {signature} = await phantom.signAndSendTransaction(
      { serialize: () => txBuf }
    );
    btn.textContent = '✅ Успешно!';
    botMsg(\`✅ <b>Своп выполнен!</b><br>TX: <a href="https://solscan.io/tx/\${signature}" target="_blank" style="color:var(--b)">\${signature.slice(0,16)}…</a>\`);
    setTimeout(()=>{btn.disabled=false;btn.textContent='⚡ СВОП';},3000);
    setTimeout(refreshWallet, 5000);
  }catch(e){
    btn.disabled=false;
    btn.textContent='⚡ СВОП';
    botMsg('⚠️ Ошибка свопа: ' + e.message);
  }
}
