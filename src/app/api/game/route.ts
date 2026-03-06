import { NextResponse } from 'next/server'

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>GodLocal Game ∞</title>
<link rel="stylesheet" href="/static/pwa/game.css">
</head>
<body>
<div class="app">
  <!-- Header -->
  <div class="header">
    <div class="logo">
      <span class="logo-name">GAME</span>
      <span class="logo-inf">∞</span>
      <span class="logo-sub">Reality-Hacking RPG</span>
    </div>
    <a href="/" class="back-btn">← GodLocal</a>
  </div>

  <!-- Mode tabs -->
  <div class="mode-tabs">
    <button class="mode-btn active" onclick="setMode('daily')" id="tab-daily">⚡ Ежедневно</button>
    <button class="mode-btn" onclick="setMode('synthesis')" id="tab-synthesis">🔮 Синтез</button>
    <button class="mode-btn" onclick="setMode('quest')" id="tab-quest">🗺 Квест</button>
  </div>

  <!-- Daily Mode -->
  <div id="mode-daily">
    <!-- Stream selector -->
    <div class="streams">
      <div class="stream-chip will selected" onclick="toggleStream('will')" id="chip-will">
        <span class="stream-icon">⚡</span>
        <div class="stream-info">
          <div class="stream-name">ПОТОК ВОЛИ</div>
          <div class="stream-sub">Намерение · Действие</div>
        </div>
      </div>
      <div class="stream-chip alchemy selected" onclick="toggleStream('alchemy')" id="chip-alchemy">
        <span class="stream-icon">⚗️</span>
        <div class="stream-info">
          <div class="stream-name">АЛХИМИЯ</div>
          <div class="stream-sub">Трансформация</div>
        </div>
      </div>
      <div class="stream-chip shadow selected" onclick="toggleStream('shadow')" id="chip-shadow">
        <span class="stream-icon">🌑</span>
        <div class="stream-info">
          <div class="stream-name">ПОТОК ТЕНИ</div>
          <div class="stream-sub">Интеграция · Сила</div>
        </div>
      </div>
      <div class="stream-chip sync selected" onclick="toggleStream('sync')" id="chip-sync">
        <span class="stream-icon">🌸</span>
        <div class="stream-info">
          <div class="stream-name">СИНХРОНИЯ</div>
          <div class="stream-sub">Знак · Поток</div>
        </div>
      </div>
    </div>

    <!-- Draw -->
    <div class="draw-area">
      <button class="draw-btn" onclick="drawCards()">✦ ВЫТЯНУТЬ КАРТЫ</button>
      <div class="cards-grid" id="cardsGrid"></div>
    </div>
  </div>

  <!-- Synthesis Mode -->
  <div id="mode-synthesis" style="display:none">
    <div class="synthesis-info">
      <div class="s-icon">🔮</div>
      <div class="s-title">Ритуал Синтеза</div>
      <div class="s-desc">Ежедневная практика для интеграции потоков.<br>Займёт 10–15 минут.</div>
    </div>
    <div class="synthesis-steps">
      <div class="step"><span class="step-num">1</span><span class="step-text"><b>Тишина</b> — закрой глаза, 3 глубоких вдоха. Обнули.</span></div>
      <div class="step"><span class="step-num">2</span><span class="step-text"><b>Воля</b> — назови одно намерение вслух. Что ты создаёшь сегодня?</span></div>
      <div class="step"><span class="step-num">3</span><span class="step-text"><b>Алхимия</b> — что можно трансформировать? Найди зерно золота в проблеме.</span></div>
      <div class="step"><span class="step-num">4</span><span class="step-text"><b>Тень</b> — что ты избегаешь? Посмотри прямо. Это твоя скрытая сила.</span></div>
      <div class="step"><span class="step-num">5</span><span class="step-text"><b>Синхрония</b> — какой знак ты уже получил сегодня? Замечай паттерны.</span></div>
      <div class="step"><span class="step-num">6</span><span class="step-text"><b>Синтез</b> — вытяни 3 карты. Они покажут поле дня.</span></div>
    </div>
    <div style="margin-top:20px">
      <button class="draw-btn" onclick="setMode('daily'); drawCards();">✦ ВЫТЯНУТЬ КАРТЫ ДНЯ</button>
    </div>
  </div>

  <!-- Quest Mode -->
  <div id="mode-quest" style="display:none">
    <!-- Personal card banner -->
    <div class="personal-card">
      <span class="personal-icon">🌊</span>
      <div class="personal-info">
        <div class="personal-name">RO | Проводник Волн</div>
        <div class="personal-stream">Поток Воли</div>
      </div>
      <span class="personal-badge">Персональная</span>
    </div>

    <div class="quest-box">
      <h3>КВЕСТ 30–90 ДНЕЙ</h3>
      <div class="quest-day-label">День квеста</div>
      <input type="number" class="quest-day-input" id="questDay" min="1" max="90" value="1" oninput="updateQuest()">
      <div class="quest-total" id="questTotal">День 1 из 90</div>
      <div class="progress-bar"><div class="progress-fill" id="questProgress" style="width:1.1%"></div></div>
      <div class="mission-label">Миссия квеста</div>
      <textarea class="mission-input" id="missionText" placeholder="Опиши свою миссию на этот квест..."></textarea>
    </div>

    <button class="draw-btn" onclick="setMode('daily'); drawCards();">✦ КАРТА ДНЯ КВЕСТА</button>
  </div>
</div>

<script src="/static/pwa/game.js"></script>
</body>
</html>`

export function GET() {
  return new NextResponse(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}