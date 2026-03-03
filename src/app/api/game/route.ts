import { NextResponse } from 'next/server'

const HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>GodLocal Game ∞</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #07090C;
  color: #e0e0e0;
  font-family: -apple-system, 'Inter', sans-serif;
  min-height: 100dvh;
  overflow-x: hidden;
  user-select: none;
}

/* ── Layout ── */
.app { max-width: 420px; margin: 0 auto; padding: 0 16px 40px; }

/* ── Header ── */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 0 14px;
  border-bottom: 1px solid #0f141a;
}
.logo { display: flex; align-items: baseline; gap: 6px; }
.logo-name { font-size: .85rem; font-weight: 800; letter-spacing: 2px; color: #6C5CE7; }
.logo-inf  { font-size: 1.3rem; color: #6C5CE7; line-height: 1; }
.logo-sub  { font-size: .65rem; color: #555; font-weight: 400; letter-spacing: .5px; margin-left: 2px; }
.back-btn  { color: #555; font-size: .75rem; text-decoration: none; padding: 4px 10px; border-radius: 6px; border: 1px solid #1a1f28; }
.back-btn:hover { color: #aaa; border-color: #333; }

/* ── Mode tabs ── */
.mode-tabs {
  display: flex; gap: 6px; margin-top: 18px; margin-bottom: 20px;
  border-bottom: 1px solid #0f141a;
}
.mode-btn {
  padding: 8px 14px 10px; font-size: .75rem; font-weight: 600; letter-spacing: .5px;
  background: none; border: none; color: #555; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: color .2s, border-color .2s;
}
.mode-btn.active { color: #6C5CE7; border-color: #6C5CE7; }

/* ── Stream chips ── */
.streams {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-bottom: 20px;
}
.stream-chip {
  padding: 10px 12px; border-radius: 10px; cursor: pointer;
  border: 1px solid transparent; transition: all .2s;
  display: flex; align-items: center; gap: 8px;
}
.stream-chip.will      { background: rgba(108,92,231,.08); border-color: rgba(108,92,231,.2); }
.stream-chip.alchemy   { background: rgba(0,255,157,.06); border-color: rgba(0,255,157,.18); }
.stream-chip.shadow    { background: rgba(100,65,165,.08); border-color: rgba(100,65,165,.2); }
.stream-chip.sync      { background: rgba(253,121,168,.07); border-color: rgba(253,121,168,.2); }
.stream-chip.selected  { opacity: 1 !important; }
.stream-chip:not(.selected) { opacity: .5; }
.stream-icon { font-size: 1.2rem; }
.stream-info { flex: 1; }
.stream-name { font-size: .72rem; font-weight: 700; letter-spacing: .5px; }
.stream-will   .stream-name { color: #6C5CE7; }
.stream-alchemy .stream-name { color: #00FF9D; }
.stream-shadow  .stream-name { color: #a78bfa; }
.stream-sync    .stream-name { color: #FD79A8; }
.stream-sub { font-size: .62rem; color: #555; }

/* ── Card draw area ── */
.draw-area { margin-bottom: 20px; }
.draw-btn {
  width: 100%; padding: 14px; border-radius: 12px;
  background: linear-gradient(135deg, #6C5CE722, #6C5CE711);
  border: 1px solid #6C5CE740;
  color: #6C5CE7; font-size: .95rem; font-weight: 700;
  cursor: pointer; letter-spacing: 1px;
  transition: all .15s;
}
.draw-btn:hover  { background: linear-gradient(135deg, #6C5CE733, #6C5CE722); }
.draw-btn:active { transform: scale(.98); }

/* ── Cards grid ── */
.cards-grid {
  display: flex; flex-direction: column;
  gap: 12px; margin-top: 14px;
}

/* ── Card ── */
.card {
  border-radius: 14px; padding: 18px;
  position: relative; overflow: hidden;
  animation: cardIn .4s cubic-bezier(.16,1,.3,1) both;
  border: 1px solid;
}
.card-will    { background: linear-gradient(135deg, #1a1535 0%, #0d0b1e 100%); border-color: #6C5CE730; }
.card-alchemy { background: linear-gradient(135deg, #071914 0%, #050e0b 100%); border-color: #00FF9D25; }
.card-shadow  { background: linear-gradient(135deg, #160d2a 0%, #0c0817 100%); border-color: #a78bfa25; }
.card-sync    { background: linear-gradient(135deg, #1f0d14 0%, #120508 100%); border-color: #FD79A825; }
.card-personal { background: linear-gradient(135deg, #161020 0%, #0e0b1a 100%); border-color: #6C5CE755; }

.card-glow {
  position: absolute; top: -30px; right: -30px;
  width: 100px; height: 100px; border-radius: 50%;
  opacity: .15; filter: blur(30px); pointer-events: none;
}
.card-will    .card-glow { background: #6C5CE7; }
.card-alchemy .card-glow { background: #00FF9D; }
.card-shadow  .card-glow { background: #a78bfa; }
.card-sync    .card-glow { background: #FD79A8; }
.card-personal .card-glow { background: #6C5CE7; }

.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.card-icon { font-size: 1.6rem; }
.card-meta { flex: 1; }
.card-stream { font-size: .62rem; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; }
.card-will    .card-stream { color: #6C5CE7aa; }
.card-alchemy .card-stream { color: #00FF9Daa; }
.card-shadow  .card-stream { color: #a78bfaaa; }
.card-sync    .card-stream { color: #FD79A8aa; }
.card-personal .card-stream { color: #6C5CE7; }
.card-num { font-size: .6rem; color: #444; margin-top: 2px; }

.card-title { font-size: 1.05rem; font-weight: 800; color: #fff; margin-bottom: 6px; letter-spacing: .5px; }
.card-body  { font-size: .8rem; color: #8896a5; line-height: 1.55; }

.card-prompt {
  margin-top: 12px; padding: 10px 12px;
  background: rgba(255,255,255,.03); border-radius: 8px;
  border-left: 2px solid;
}
.card-will    .card-prompt { border-color: #6C5CE760; }
.card-alchemy .card-prompt { border-color: #00FF9D60; }
.card-shadow  .card-prompt { border-color: #a78bfa60; }
.card-sync    .card-prompt { border-color: #FD79A860; }
.card-personal .card-prompt { border-color: #6C5CE7; }
.card-prompt-label { font-size: .62rem; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
.card-prompt-text  { font-size: .8rem; font-style: italic; color: #aab; }

/* ── Quest tracker (Mode: Quest) ── */
.quest-box {
  border-radius: 14px; padding: 20px;
  background: linear-gradient(135deg, #0d0b1e, #070518);
  border: 1px solid #6C5CE730;
  margin-bottom: 16px;
}
.quest-box h3 { font-size: .85rem; color: #6C5CE7; letter-spacing: 1px; margin-bottom: 12px; }
.quest-day-label { font-size: .7rem; color: #555; margin-bottom: 6px; }
.quest-day-input {
  width: 80px; background: #1a1535; border: 1px solid #6C5CE740;
  color: #6C5CE7; padding: 6px 10px; border-radius: 7px;
  font-size: .9rem; font-weight: 700; text-align: center; outline: none;
}
.quest-total { font-size: .7rem; color: #555; margin-top: 4px; }
.progress-bar { height: 4px; background: #1a1535; border-radius: 2px; margin-top: 14px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #6C5CE7, #FD79A8); border-radius: 2px; transition: width .5s; }
.mission-label { font-size: .7rem; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px; }
.mission-input {
  width: 100%; background: #1a1535; border: 1px solid #6C5CE730;
  color: #ccc; padding: 9px 12px; border-radius: 8px;
  font-size: .82rem; font-family: inherit; outline: none;
  resize: none; min-height: 56px;
}
.mission-input:focus { border-color: #6C5CE755; }

/* ── Synthesis mode ── */
.synthesis-info {
  text-align: center; padding: 24px 0 16px;
}
.synthesis-info .s-icon { font-size: 2.5rem; margin-bottom: 8px; }
.synthesis-info .s-title { font-size: 1rem; font-weight: 700; color: #a78bfa; margin-bottom: 6px; }
.synthesis-info .s-desc  { font-size: .78rem; color: #666; line-height: 1.5; }
.synthesis-steps {
  display: flex; flex-direction: column; gap: 10px; margin-top: 16px;
}
.step {
  padding: 12px 14px; border-radius: 10px;
  background: rgba(108,92,231,.07); border: 1px solid rgba(108,92,231,.15);
  display: flex; align-items: center; gap: 10px;
}
.step-num { font-size: .7rem; font-weight: 700; color: #6C5CE7; background: #6C5CE722; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.step-text { font-size: .78rem; color: #aab; line-height: 1.4; }

/* ── Personal card banner ── */
.personal-card {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #161020, #0e0b1a);
  border: 1px solid #6C5CE755;
  display: flex; align-items: center; gap: 12px;
}
.personal-icon { font-size: 1.4rem; }
.personal-info { flex: 1; }
.personal-name { font-size: .8rem; font-weight: 700; color: #9e8cff; }
.personal-stream { font-size: .65rem; color: #6C5CE7; letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }
.personal-badge { font-size: .6rem; padding: 2px 7px; background: #6C5CE722; color: #9e8cff; border-radius: 10px; border: 1px solid #6C5CE730; }

/* ── Animations ── */
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
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

<script>
// ─── Card data ───────────────────────────────────────────────────────
const DECKS = {
  will: [
    { icon:'⚡', title:'Намерение', body:'Одно намерение управляет всем. Какова твоя единственная истина сегодня?', prompt:'Назови намерение в одном предложении.' },
    { icon:'🗡', title:'Действие', body:'Есть шаг, который двигает всё. Не два шага — один. Самый неудобный.', prompt:'Что ты сделаешь в ближайшие 10 минут?' },
    { icon:'🔥', title:'Прорыв', body:'Барьер — это не стена. Это форма, которую принимает твоя сила перед скачком.', prompt:'Что ты наконец перестанешь избегать?' },
    { icon:'🎯', title:'Фокус', body:'Куда идёт внимание — туда идёт всё. Рассеянность — утечка жизни.', prompt:'На что ты кладёшь весь фокус сегодня?' },
    { icon:'👑', title:'Командор', body:'Веди себя так, будто уже пришёл. Тело знает то, что ум ещё сомневается.', prompt:'Как бы ты действовал, уже достигнув цели?' },
    { icon:'🌊', title:'Поток Воли', body:'Воля — не напряжение. Это река, которая знает путь к морю.', prompt:'Где ты сопротивляешься своему же потоку?' },
    { icon:'🔑', title:'Инициация', body:'Каждый день — начало новой главы. Только ты решаешь, какой она будет.', prompt:'Какую главу ты начинаешь сегодня?' },
    { icon:'📜', title:'Манифест', body:'Реальность отвечает на ясность. Туман желаний не создаёт ничего.', prompt:'Провозгласи своё намерение вслух.' },
  ],
  alchemy: [
    { icon:'⚗️', title:'Трансформация', body:'Всё, что кажется помехой — сырьё. Алхимик не жалуется на руду.', prompt:'Что ты превратишь из свинца в золото сегодня?' },
    { icon:'🔮', title:'Синтез', body:'Два противоречия — это одна истина в разных масках. Найди третье.', prompt:'Какие силы внутри тебя кажутся противоположными?' },
    { icon:'🪞', title:'Зеркало', body:'Мир отражает твоё внутреннее состояние с задержкой. Что ты видишь?', prompt:'Что внешнее указывает на твоё внутреннее?' },
    { icon:'🧪', title:'Лаборатория', body:'Сегодня — эксперимент. Гипотезу нельзя проверить без действия.', prompt:'Что ты тестируешь? Каков критерий успеха?' },
    { icon:'🌡', title:'Растворение', body:'Форма, которая отжила, должна раствориться. Это не потеря — освобождение.', prompt:'Что пора отпустить, чтобы возникло новое?' },
    { icon:'✨', title:'Возгонка', body:'Поднимись над материальным. Есть уровень, с которого видно иначе.', prompt:'Если смотреть с высоты — что важно? Что иллюзия?' },
    { icon:'💎', title:'Золото', body:'В каждом дне — скрытая ценность. Алхимик видит её там, где другие — хаос.', prompt:'Что становится ценным, если изменить угол зрения?' },
    { icon:'🌀', title:'Элементы', body:'Огонь действует. Вода течёт. Земля держит. Воздух связывает. Ты сейчас — что?', prompt:'Какой элемент тебе нужен сегодня?' },
  ],
  shadow: [
    { icon:'🌑', title:'Тень', body:'Тень — не враг. Это твоя мощь, которая ждёт интеграции в темноте.', prompt:'Что ты прячешь, что на самом деле является силой?' },
    { icon:'😨', title:'Страх', body:'Страх указывает туда, где растёт следующая версия тебя. Иди туда.', prompt:'Какой страх ты встретишь лицом к лицу сегодня?' },
    { icon:'⚫', title:'Сила Тени', body:'Нельзя стать светом, не зная своей темноты. Оба полюса — ты.', prompt:'Какую тёмную черту ты можешь использовать как ресурс?' },
    { icon:'🌒', title:'Маска', body:'Какую маску ты носишь? Иногда маска защищает. Иногда — тюрьма.', prompt:'Перед кем ты не такой, какой есть? Почему?' },
    { icon:'🔐', title:'Потаённое', body:'Невысказанное управляет. То, что не названо, имеет власть.', prompt:'Что ты давно не говоришь себе честно?' },
    { icon:'🌑', title:'Подземный мир', body:'Спуск предшествует подъёму. Герои уходят в подземный мир не умирать — а возвращаться.', prompt:'Что ты сейчас проходишь, что кажется потерей, но является трансформацией?' },
    { icon:'🪞', title:'Зеркало Тени', body:'Те, кто тебя раздражает, отражают то, что ты не принимаешь в себе.', prompt:'Кто тебя сейчас триггерит? Что это зеркалит?' },
    { icon:'🕷', title:'Интеграция', body:'Принять все части себя — не слабость. Это путь к целостности.', prompt:'Какую часть себя ты готов принять сегодня?' },
  ],
  sync: [
    { icon:'🌸', title:'Знак', body:'Знаки повсюду для тех, кто смотрит. Случайностей нет — есть паттерны.', prompt:'Какой знак ты получил сегодня? Что он означает?' },
    { icon:'🌊', title:'Поток', body:'Когда идёшь по потоку — усилий минимум, результат максимум. Ты в потоке?', prompt:'Где сегодня чувствуется лёгкость? Туда и иди.' },
    { icon:'⏱', title:'Момент', body:'Прошлое — закрыто. Будущее — открыто. Только сейчас — реально.', prompt:'Что есть прямо сейчас? Побудь в этом 60 секунд.' },
    { icon:'🕸', title:'Паутина', body:'Всё связано. Твоё действие — рябь на поверхности воды. Кого она достигнет?', prompt:'Как твои действия влияют на что-то большее тебя?' },
    { icon:'🔮', title:'Откровение', body:'Что-то хочет стать ясным сегодня. Готов ли ты видеть?', prompt:'Какая истина пытается к тебе пробиться?' },
    { icon:'🤝', title:'Связь', body:'Вселенная посылает людей как подсказки. Кто появился не случайно?', prompt:'Кого тебе послали сегодня? С каким посланием?' },
    { icon:'🎲', title:'Случайность', body:'Случайностей нет. Есть совпадения для тех, кто не верит в паттерны.', prompt:'Какое "случайное" событие заслуживает твоего внимания?' },
    { icon:'🌙', title:'Судьба', body:'Судьба — не то, что происходит с тобой. Это то, что ты выбираешь принять и создать.', prompt:'Чему ты сопротивляешься, что может быть твоей судьбой?' },
  ]
};

// ─── State ────────────────────────────────────────────────────────────
let activeMode = 'daily';
let selectedStreams = new Set(['will','alchemy','shadow','sync']);

// Load saved quest data
window.addEventListener('DOMContentLoaded', () => {
  const savedDay = localStorage.getItem('gl_quest_day');
  const savedMission = localStorage.getItem('gl_quest_mission');
  if (savedDay) { document.getElementById('questDay').value = savedDay; updateQuest(); }
  if (savedMission) document.getElementById('missionText').value = savedMission;
  document.getElementById('missionText').addEventListener('input', e => {
    localStorage.setItem('gl_quest_mission', e.target.value);
  });
});

function setMode(m) {
  activeMode = m;
  ['daily','synthesis','quest'].forEach(id => {
    document.getElementById('mode-'+id).style.display = id===m ? 'block' : 'none';
    document.getElementById('tab-'+id).classList.toggle('active', id===m);
  });
}

function toggleStream(s) {
  if (selectedStreams.has(s)) {
    if (selectedStreams.size === 1) return; // keep at least one
    selectedStreams.delete(s);
    document.getElementById('chip-'+s).classList.remove('selected');
  } else {
    selectedStreams.add(s);
    document.getElementById('chip-'+s).classList.add('selected');
  }
}

function rand(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function drawCards() {
  setMode('daily');
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';

  const streams = Array.from(selectedStreams);
  // Draw 1 card per selected stream (max 4)
  const toDraw = streams.slice(0, 4);

  toDraw.forEach((stream, i) => {
    const deck = DECKS[stream];
    const card = rand(deck);
    const el = document.createElement('div');
    el.className = 'card card-' + stream;
    el.style.animationDelay = (i * 0.12) + 's';
    el.innerHTML = \`
      <div class="card-glow"></div>
      <div class="card-header">
        <span class="card-icon">\${card.icon}</span>
        <div class="card-meta">
          <div class="card-stream">\${streamLabel(stream)}</div>
          <div class="card-num">Карта #\${Math.floor(Math.random()*99)+1}</div>
        </div>
      </div>
      <div class="card-title">\${card.title}</div>
      <div class="card-body">\${card.body}</div>
      <div class="card-prompt">
        <div class="card-prompt-label">Вопрос</div>
        <div class="card-prompt-text">\${card.prompt}</div>
      </div>
    \`;
    grid.appendChild(el);
  });
}

function streamLabel(s) {
  return { will:'Поток Воли', alchemy:'Алхимия', shadow:'Поток Тени', sync:'Синхрония' }[s];
}

function updateQuest() {
  const day = parseInt(document.getElementById('questDay').value) || 1;
  const clamped = Math.max(1, Math.min(90, day));
  document.getElementById('questTotal').textContent = \`День \${clamped} из 90\`;
  document.getElementById('questProgress').style.width = (clamped/90*100).toFixed(1) + '%';
  localStorage.setItem('gl_quest_day', clamped);
}
</script>
</body>
</html>\`

export function GET() {
  return new NextResponse(HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
