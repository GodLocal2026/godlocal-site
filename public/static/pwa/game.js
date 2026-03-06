// GAME - Extracted JavaScript
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