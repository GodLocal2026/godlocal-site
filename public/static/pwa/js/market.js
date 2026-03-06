// SMERTCH Market - Market tab with CoinGecko data


// ══ TAB NAVIGATION ═════════════════════════════════════════════════════════════
const wolfEls = ['chips','fltPanel','chat','input-wrap'];
let currentTab = 'wolf';
async function switchTab(tab){
  currentTab = tab;
  const wolfVisible = tab === 'wolf';
  const mktVisible  = tab === 'market';
  const wltVisible  = tab === 'wallet';

  // Show/hide main content areas
  document.getElementById('chat').style.display         = wolfVisible ? 'flex'  : 'none';
  document.getElementById('marketPanel').style.display  = mktVisible  ? 'flex'  : 'none';
  document.getElementById('walletPanel').style.display  = wltVisible  ? 'flex'  : 'none';

  // Wolf-only chrome
  document.querySelector('.chips').style.display = wolfVisible ? 'flex' : 'none';
  const fp = document.getElementById('fltPanel');
  if(fp) fp.style.display = wolfVisible ? (fp.classList.contains('open') ? 'block' : 'none') : 'none';
  const amb = document.querySelector('.agent-mode-bar');
  if(amb) amb.style.display = wolfVisible ? 'flex' : 'none';

  // Tab highlight
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('tab-' + tab);
  if(activeBtn) activeBtn.classList.add('active');
}


// ══ MARKET MODULE ══════════════════════════════════════════════════════════════
let mktData = [], mktCat = 'top', mktLoaded = {};
const COINGECKO = 'https://api.coingecko.com/api/v3';

async function loadMarket(){
  if(mktLoaded[mktCat] && Date.now() - mktLoaded[mktCat] < 60000) return; // 1min cache
  const list = document.getElementById('mktList');
  list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--dim)">⏳ Загрузка…</div>';
  try{
    let url;
    if(mktCat === 'top'){
      url = COINGECKO + '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=1h,24h&sparkline=false';
    } else {
      url = COINGECKO + '/coins/markets?vs_currency=usd&category=' + mktCat + '&order=market_cap_desc&per_page=100&page=1&price_change_percentage=1h,24h&sparkline=false';
    }
    const r = await fetch(url);
    if(!r.ok) throw new Error('CoinGecko ' + r.status);
    mktData = await r.json();
    mktLoaded[mktCat] = Date.now();
    renderMarket(mktData);
  }catch(e){
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--dim)">⚠️ ' + e.message + '<br><small>Rate limit — кликни снова через 10 сек</small></div>';
    mktLoaded[mktCat] = Date.now() - 50000; // allow retry after 10s
  }
}

let _mktCatTimer=null;
function mktSetCat(cat, el){
  mktCat = cat;
  document.querySelectorAll('.mkt-cat-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  clearTimeout(_mktCatTimer);
  _mktCatTimer = setTimeout(loadMarket, 300); // 300ms debounce
}

function mktFilter(q){
  if(!q) { renderMarket(mktData); return; }
  const ql = q.toLowerCase();
  renderMarket(mktData.filter(c => c.symbol.toLowerCase().includes(ql) || c.name.toLowerCase().includes(ql)));
}

function fmtPrice(p){
  if(!p && p!==0) return '—';
  if(p >= 1000) return '$' + p.toLocaleString('en-US', {maximumFractionDigits:0});
  if(p >= 1) return '$' + p.toLocaleString('en-US', {maximumFractionDigits:2});
  if(p >= 0.01) return '$' + p.toFixed(4);
  return '$' + p.toFixed(8);
}
function fmtMcap(v){
  if(!v) return '';
  if(v >= 1e12) return '$' + (v/1e12).toFixed(2)+'T';
  if(v >= 1e9) return '$' + (v/1e9).toFixed(2)+'B';
  if(v >= 1e6) return '$' + (v/1e6).toFixed(1)+'M';
  return '$' + (v/1e3).toFixed(0)+'K';
}

function renderMarket(coins){
  const list = document.getElementById('mktList');
  if(!coins.length){list.innerHTML='<div style="text-align:center;padding:40px;color:var(--dim)">Ничего не найдено</div>';return;}
  list.innerHTML = coins.map((c,i) => {
    const chg = c.price_change_percentage_24h || 0;
    const chgCls = chg >= 0 ? 'up' : 'dn';
    const chgStr = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
    return \`<div class="mkt-row" onclick="mktOpenCoin('\${c.id}','\${c.symbol.toUpperCase()}','\${esc(c.name)}',\${c.current_price||0},\${chg})">
      <span class="mkt-rank">\${c.market_cap_rank||i+1}</span>
      <img class="mkt-icon" src="\${c.image||''}" alt="\${c.symbol}" onerror="this.style.display='none'">
      <div class="mkt-info">
        <div class="mkt-sym">\${c.symbol.toUpperCase()}</div>
        <div class="mkt-name">\${esc(c.name)}</div>
      </div>
      <div class="mkt-right">
        <div class="mkt-price">\${fmtPrice(c.current_price)}</div>
        <div class="mkt-chg \${chgCls}">\${chgStr}</div>
        <div class="mkt-mcap">\${fmtMcap(c.market_cap)}</div>
      </div>
    </div>\`;
  }).join('');
}

async function mktOpenCoin(id, sym, name, price, chg){
  // Switch to WOLF tab and analyze
  switchTab('wolf');
  const ctx = \`\${sym} (\${name}) | Цена: \${fmtPrice(price)} | 24h: \${chg>=0?'+':''}+\${chg.toFixed(2)}%\`;
  lastTokenCtx = ctx;
  const q = \`Анализ \${sym}: цена \${fmtPrice(price)}, 24h \${chg>=0?'+':''}+\${chg.toFixed(2)}%. Стоит входить?\`;
  userBubble(q);
  agentMode ? askAgents(q) : askAI(q);
}
