import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<title>SMERTCH — X100</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="stylesheet" href="/static/pwa/smertch.css">
</head>
<body>

<!-- TOP BAR -->
<div class="top">
  <div class="dot" id="dot"></div>
  <span class="logo">SMERTCH ⚡</span>
  <span class="ticker" id="tkr"></span>
  <div class="tg-status" id="tgDot" title="Telegram push" onclick="cmd('tg setup')"></div>
  <button class="kill" id="killBtn" onclick="toggleKill()">☠</button>
</div>

<!-- CHIPS -->
<div class="chips">
  <div class="chip scan" onclick="cmd('скан')">🌪️ Скан</div>
  <div class="chip pump" onclick="cmd('pump')">🔥 PUMP.FUN</div>
  <div class="chip sig"  onclick="cmd('сигналы')">⚡ Сигналы</div>
  <div class="chip bag"  onclick="cmd('баг')">💼 Баг</div>
  <div class="chip tg-chip" onclick="cmd('горячие')">🔥 Горячие</div>
  <div class="chip flt" id="fltChip" onclick="toggleFilters()">⚙️ Фильтры</div>
  <div class="chip" onclick="cmd('стратегия')">🧠 AI</div>
</div>

<!-- FILTER PANEL -->
<div class="flt-panel" id="fltPanel">
  <div class="flt-row">
    <span class="flt-label">MCap</span>
    <div class="flt-btn on" onclick="setF('mcap',0,this)">Любой</div>
    <div class="flt-btn" onclick="setF('mcap',50000,this)">&lt;50K</div>
    <div class="flt-btn" onclick="setF('mcap',200000,this)">&lt;200K</div>
    <div class="flt-btn" onclick="setF('mcap',500000,this)">&lt;500K</div>
    <div class="flt-btn" onclick="setF('mcap',1000000,this)">&lt;1M</div>
    <div class="flt-reset" onclick="resetFilters()">Сброс</div>
  </div>
  <div class="flt-row">
    <span class="flt-label">Ликв.</span>
    <div class="flt-btn on" onclick="setF('liq',0,this)">Любая</div>
    <div class="flt-btn" onclick="setF('liq',5000,this)">&gt;5K</div>
    <div class="flt-btn" onclick="setF('liq',20000,this)">&gt;20K</div>
    <div class="flt-btn" onclick="setF('liq',50000,this)">&gt;50K</div>
  </div>
  <div class="flt-row">
    <span class="flt-label">Возраст</span>
    <div class="flt-btn on" onclick="setF('age',0,this)">Любой</div>
    <div class="flt-btn" onclick="setF('age',30,this)">&lt;30m</div>
    <div class="flt-btn" onclick="setF('age',120,this)">&lt;2h</div>
    <div class="flt-btn" onclick="setF('age',360,this)">&lt;6h</div>
    <div class="flt-btn" onclick="setF('sig','buy',this)">🟢 BUY only</div>
  </div>
</div>

<!-- CHAT -->
<div class="chat" id="chat"></div>

<!-- INPUT -->
<div class="input-wrap">
  <div class="input-row">
    <textarea class="inp" id="inp" rows="1" placeholder="Токен / адрес / вопрос…"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send()}"
      oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,110)+'px'"></textarea>
    <button class="mic" id="micBtn" onclick="toggleVoice()" title="Голосовой ввод">🎙</button>
    <button class="agent-toggle" id="agentToggle" onclick="toggleAgentMode()">🤖</button>
    <button class="send" onclick="send()">↑</button>
  </div>
  <div id="agentModeBar" class="agent-mode-bar">⚡ OASIS COUNCIL — анализ через агентов</div>
</div>

<script src="/static/pwa/js/globals.js"></script>
<script src="/static/pwa/js/utils.js"></script>
<script src="/static/pwa/js/filters.js"></script>
<script src="/static/pwa/js/signals.js"></script>
<script src="/static/pwa/js/chat.js"></script>
<script src="/static/pwa/js/cards.js"></script>
<script src="/static/pwa/js/scanner.js"></script>
<script src="/static/pwa/js/portfolio.js"></script>
<script src="/static/pwa/js/analyzer.js"></script>
<script src="/static/pwa/js/telegram.js"></script>
<script src="/static/pwa/js/ai-chat.js"></script>
<script src="/static/pwa/js/market.js"></script>
<script src="/static/pwa/js/wallet.js"></script>
<script src="/static/pwa/js/agents.js"></script>
<script src="/static/pwa/js/voice.js"></script>
<script src="/static/pwa/js/app.js"></script>

<!-- ══ MARKET PANEL ══════════════════════════════════════════════ -->
<div id="marketPanel">
  <div class="mkt-cat" id="mktCat">
    <div class="mkt-cat-btn active" onclick="mktSetCat('top',this)">🌐 Все</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('layer-1',this)">⛓ L1</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('defi',this)">🏦 DeFi</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('meme-token',this)">🐸 Мем</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('ai-big-data',this)">🤖 AI</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('gaming',this)">🎮 Gaming</div>
    <div class="mkt-cat-btn" onclick="mktSetCat('solana-ecosystem',this)">◎ Solana</div>
  </div>
  <input class="mkt-search" id="mktSearch" placeholder="🔍 BTC, ETH, SOL..." oninput="mktFilter(this.value)">
  <div class="mkt-list" id="mktList"><div style="text-align:center;padding:40px;color:var(--dim)">Загрузка рынка…</div></div>
</div>

<!-- ══ WALLET PANEL ══════════════════════════════════════════════ -->
<div id="walletPanel">
  <div id="walletDisconnected">
    <div style="text-align:center;padding:24px 16px 8px">
      <div style="font-size:36px;margin-bottom:8px">👻</div>
      <div style="font-size:16px;font-weight:700;color:var(--fg);margin-bottom:6px">Phantom Wallet</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:16px">Подключи кошелёк чтобы видеть баланс и торговать прямо здесь</div>
    </div>
    <div class="wallet-connect-btn" onclick="connectPhantom()">👻 Подключить Phantom</div>
    <div style="font-size:11px;color:var(--dim);text-align:center">Нет Phantom? <a href="https://phantom.app" target="_blank" style="color:var(--b)">phantom.app</a></div>
  </div>
  <div id="walletConnected" style="display:none">
    <div class="wallet-addr" id="walletAddr"></div>
    <div class="wallet-bal">
      <div>
        <div class="wallet-bal-label">SOL Balance</div>
        <div class="wallet-bal-val" id="solBal">—</div>
      </div>
      <div style="text-align:right">
        <div class="wallet-bal-label">USD Value</div>
        <div class="wallet-bal-usd" id="solUsd">—</div>
      </div>
      <button onclick="refreshWallet()" style="background:none;border:none;color:var(--dim);font-size:16px;cursor:pointer">⟳</button>
    </div>
    <div class="qk-row">
      <span style="font-size:10px;color:var(--dim);margin-right:2px">⚡</span>
      <button class="qk-btn" onclick="setQkSol(0.05,this)">0.05</button>
      <button class="qk-btn active" onclick="setQkSol(0.1,this)">0.1</button>
      <button class="qk-btn" onclick="setQkSol(0.5,this)">0.5</button>
      <button class="qk-btn" onclick="setQkSol(1,this)">1 SOL</button>
    </div>

    <!-- SWAP TERMINAL -->
    <div class="swap-box">
      <div class="swap-title">⚡ Торговый терминал</div>
      <div class="swap-tabs">
        <div class="swap-tab active" id="swapTabBuy" onclick="setSwapMode('buy')">🟢 КУПИТЬ</div>
        <div class="swap-tab" id="swapTabSell" onclick="setSwapMode('sell')">🔴 ПРОДАТЬ</div>
      </div>
      <div class="swap-row">
        <input class="swap-inp" id="swapAmt" type="number" placeholder="0.0" step="any" oninput="debounceQuote()">
        <select class="swap-sel" id="swapSolAmt" style="display:none">
          <option value="0.1">0.1 SOL</option>
          <option value="0.5">0.5 SOL</option>
          <option value="1">1 SOL</option>
          <option value="custom">Своё</option>
        </select>
        <div class="swap-sel" id="swapFromLabel">SOL</div>
      </div>
      <div class="swap-row">
        <input class="swap-inp" id="swapToAddr" placeholder="Адрес токена (mint)..." style="font-size:11px;font-family:monospace">
        <div class="swap-sel" id="swapToLabel">TOKEN</div>
      </div>
      <div class="swap-quote" id="swapQuote"></div>
      <button class="swap-btn" id="swapBtn" onclick="execSwap()">⚡ СВОП</button>
    </div>

    <!-- TOKEN HOLDINGS -->
    <div style="font-size:11px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Токены в кошельке</div>
    <div id="tokenList"><div style="color:var(--dim);font-size:12px">Загрузка…</div></div>
  </div>
</div>

<!-- ══ BOTTOM TAB BAR ══════════════════════════════════════════════ -->
<div class="tab-bar">
  <div class="tab active" id="tabWolf" onclick="switchTab('wolf')">
    <span class="tab-ico">⚡</span>WOLF
  </div>
  <div class="tab" id="tabMarket" onclick="switchTab('market')">
    <span class="tab-ico">📊</span>РЫНОК
  </div>
  <div class="tab" id="tabWallet" onclick="switchTab('wallet')">
    <span class="tab-ico">💼</span>КОШЕЛЁК
  </div>
</div>

</body>
</html>`;


export async function GET() {
  return new NextResponse(HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'pragma': 'no-cache',
      'expires': '0',
    },
  });
}
