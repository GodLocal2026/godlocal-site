"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════
   100-DAY PROGRAM CONTENT
   ═══════════════════════════════════════════════ */
const PROGRAM: Record<number, {
  sprint: string; sprintIcon: string; title: string; desc: string; mantra: string;
  articles: { title: string; url: string; emoji: string }[];
  practices: { name: string; duration: string; icon: string }[];
  aiGreeting: string;
}> = {
  1: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Наблюдатель",
    desc: "Сегодня ты учишься наблюдать. Не менять, не бороться — просто замечать. 10 минут тишины. Что ты слышишь внутри?",
    mantra: "Я наблюдаю, не реагирую",
    articles: [
      { title: "Зачем нужна осознанность: нейронаука внимания", url: "https://www.mindful.org/the-science-of-mindfulness/", emoji: "🧠" },
      { title: "10-минутная медитация для начинающих", url: "https://www.headspace.com/meditation/10-minute-meditation", emoji: "🧘" },
      { title: "Как тишина меняет мозг", url: "https://www.bbc.com/future/article/20170525-the-surprising-benefits-of-silence", emoji: "🤫" },
      { title: "Дневник наблюдений: как начать", url: "https://psychcentral.com/blog/ready-set-journal-64-journaling-prompts-for-self-discovery", emoji: "📓" },
    ],
    practices: [
      { name: "Тишина 10 мин", duration: "10 мин", icon: "🤫" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Запись 3 мыслей", duration: "5 мин", icon: "✍️" },
    ],
    aiGreeting: "Привет! День 1 — начало пути. Сегодня задача простая: 10 минут тишины. Не нужно ничего менять — просто наблюдай. Что замечаешь внутри прямо сейчас?",
  },
  2: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Карта состояния",
    desc: "Оцени каждую сферу жизни. Честно, без приукрашивания. Это твоя стартовая точка — через 100 дней сравнишь.",
    mantra: "Честность — первый шаг к изменению",
    articles: [
      { title: "Колесо жизни: как оценить все сферы", url: "https://www.mindtools.com/aor16a3/the-wheel-of-life", emoji: "🎯" },
      { title: "Почему самооценка искажена и как это исправить", url: "https://hbr.org/2018/01/what-self-awareness-really-is-and-how-to-cultivate-it", emoji: "🪞" },
      { title: "Честный аудит: 5 вопросов к себе", url: "https://markmanson.net/life-audit", emoji: "📋" },
    ],
    practices: [
      { name: "Оценка 5 сфер (1-10)", duration: "10 мин", icon: "📊" },
      { name: "Одно слово для каждой", duration: "5 мин", icon: "🏷️" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
    ],
    aiGreeting: "День 2. Сегодня — честный аудит. Тело, разум, деньги, энергия, душа. Оцени каждое от 1 до 10. Не думай долго — первая цифра обычно самая честная. Какая сфера просит внимания больше всего?",
  },
  3: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Цифровой рассвет",
    desc: "Первые 2 часа без телефона. Заполни это время чем-то живым: движение, дыхание, запись мыслей.",
    mantra: "Утро определяет день",
    articles: [
      { title: "Что происходит с мозгом при утреннем скроллинге", url: "https://www.forbes.com/health/mind/phone-addiction/", emoji: "📱" },
      { title: "Утренние ритуалы продуктивных людей", url: "https://www.cnbc.com/morning-routine-tips/", emoji: "☀️" },
      { title: "Допамин и привычки: как перезагрузить", url: "https://hubermanlab.com/controlling-your-dopamine-for-motivation-focus-and-satisfaction/", emoji: "⚡" },
    ],
    practices: [
      { name: "2 часа без телефона", duration: "120 мин", icon: "📵" },
      { name: "Дыхание при пробуждении", duration: "5 мин", icon: "🫁" },
      { name: "Утренняя запись", duration: "10 мин", icon: "✍️" },
    ],
    aiGreeting: "День 3 — цифровой рассвет. Как это: проснуться и НЕ потянуться к телефону? Сегодня проверим. 2 часа утренней свободы. Что ты сделаешь вместо скроллинга?",
  },
};

// Generic content for days without specific program
const getDay = (n: number) => {
  if (PROGRAM[n]) return PROGRAM[n];
  const sprintIdx = Math.floor((n - 1) / 10);
  const sprintNames = ["Пробуждение","Очищение","Дисциплина","Тело","Разум","Деньги","Отношения","Творчество","Миссия","Интеграция"];
  const sprintIcons = ["🌅","🌊","⚡","🔥","🧠","💎","🤝","🎨","🎯","∞"];
  const themes = [
    { articles: [
        { title: "Осознанность в повседневной жизни", url: "https://www.mindful.org/how-to-practice-mindfulness/", emoji: "🧘" },
        { title: "Нейропластичность: мозг меняется", url: "https://www.verywellmind.com/what-is-brain-plasticity-2794886", emoji: "🧠" },
        { title: "Привычки: наука маленьких шагов", url: "https://jamesclear.com/atomic-habits-summary", emoji: "🪜" },
        { title: "Дыхательные техники для каждого дня", url: "https://www.healthline.com/health/breathing-exercises", emoji: "🫁" },
      ],
    },
  ];
  return {
    sprint: sprintNames[sprintIdx] || "Путь", sprintIcon: sprintIcons[sprintIdx] || "○",
    title: `День ${n}`,
    desc: `Спринт "${sprintNames[sprintIdx]}". Продолжай практику, записывай наблюдения, дыши.`,
    mantra: "Каждый день — один шаг вперёд",
    articles: themes[0].articles,
    practices: [
      { name: "Практика дня", duration: "15 мин", icon: sprintIcons[sprintIdx] || "○" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Дневник", duration: "10 мин", icon: "✍️" },
    ],
    aiGreeting: `День ${n}. Ты уже ${n} дней на пути — это больше, чем у 90% людей. Как себя чувствуешь сегодня?`,
  };
};

/* ═══════════════════════════════════════════════
   RADIO STATIONS
   ═══════════════════════════════════════════════ */
const RADIO = [
  { name: "Lofi Focus", url: "https://streams.ilovemusic.de/iloveradio17.mp3", icon: "🎧" },
  { name: "Chill Ambient", url: "https://ice1.somafm.com/dronezone-128-mp3", icon: "🌙" },
  { name: "Nature Sounds", url: "https://ice1.somafm.com/fluid-128-mp3", icon: "🌿" },
];

/* ═══════════════════════════════════════════════
   AI CHAT (local, pre-scripted)
   ═══════════════════════════════════════════════ */
const AI_RESPONSES: Record<string, string[]> = {
  default: [
    "Расскажи подробнее — что именно чувствуешь?",
    "Интересно. А что бы ты сделал, если бы не было страха?",
    "Попробуй записать это в дневник — мысли становятся яснее на бумаге.",
    "Как думаешь, это связано с чем-то конкретным?",
    "Хороший вопрос. Давай разберём по частям.",
    "Обрати внимание на своё дыхание прямо сейчас. Глубокий вдох.",
    "Это нормально. Рост не линейный — бывают и тяжёлые дни.",
  ],
  good: [
    "Отлично! Что именно дало энергию сегодня?",
    "Держи волну. Запиши, что сработало — пригодится в трудный день.",
    "Красиво. Когда ты в потоке — всё получается.",
  ],
  bad: [
    "Бывает. Не нужно быть на пике каждый день.",
    "Что если сегодня — просто дышать и быть? Без целей, без давления.",
    "Тяжёлые дни — часть процесса. Ты не откатился. Ты отдыхаешь.",
  ],
};

const getAIResponse = (msg: string): string => {
  const lower = msg.toLowerCase();
  const goodWords = ["хорошо","отлично","круто","огонь","класс","супер","кайф","энергия","рад","happy"];
  const badWords = ["плохо","тяжело","устал","сложно","грустно","лень","не хочу","тревога","sad"];
  let pool = AI_RESPONSES.default;
  if (goodWords.some(w => lower.includes(w))) pool = AI_RESPONSES.good;
  if (badWords.some(w => lower.includes(w))) pool = AI_RESPONSES.bad;
  return pool[Math.floor(Math.random() * pool.length)];
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function X100Oasis() {
  // State
  const [currentDay, setCurrentDay] = useState(1);
  const [chatMessages, setChatMessages] = useState<{role:"ai"|"user";text:string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioIdx, setRadioIdx] = useState(0);
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in"|"hold"|"out">("in");
  const [breathCount, setBreathCount] = useState(0);
  const [journalText, setJournalText] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const dayData = getDay(currentDay);

  // Init AI greeting
  useEffect(() => {
    setChatMessages([{ role: "ai", text: dayData.aiGreeting }]);
    setJournalText("");
    setJournalSaved(false);
  }, [currentDay]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("x100v2_completed");
      if (saved) setCompletedDays(JSON.parse(saved));
      const savedDay = localStorage.getItem("x100v2_day");
      if (savedDay) setCurrentDay(parseInt(savedDay));
    } catch {}
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem("x100v2_completed", JSON.stringify(completedDays));
    localStorage.setItem("x100v2_day", currentDay.toString());
  }, [completedDays, currentDay]);

  // Breathing timer
  useEffect(() => {
    if (!breathActive) return;
    const phases: Array<{phase:"in"|"hold"|"out";dur:number}> = [
      {phase:"in",dur:4000},{phase:"hold",dur:2000},{phase:"out",dur:6000}
    ];
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setBreathPhase(phases[idx].phase);
      timer = setTimeout(() => {
        idx = (idx+1)%3;
        if(idx===0) setBreathCount(c=>c+1);
        cycle();
      }, phases[idx].dur);
    };
    cycle();
    return () => clearTimeout(timer);
  }, [breathActive]);

  // Radio
  const toggleRadio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(RADIO[radioIdx].url);
      audioRef.current.volume = 0.3;
    }
    if (radioPlaying) { audioRef.current.pause(); }
    else { audioRef.current.src = RADIO[radioIdx].url; audioRef.current.play().catch(()=>{}); }
    setRadioPlaying(!radioPlaying);
  };

  const nextStation = () => {
    const next = (radioIdx+1)%RADIO.length;
    setRadioIdx(next);
    if (audioRef.current && radioPlaying) {
      audioRef.current.src = RADIO[next].url;
      audioRef.current.play().catch(()=>{});
    }
  };

  // Chat
  const sendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, {role:"user",text:userMsg}]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages(prev => [...prev, {role:"ai",text:getAIResponse(userMsg)}]);
    }, 800 + Math.random()*1200);
  };

  // Complete day
  const completeDay = () => {
    if (!completedDays.includes(currentDay)) {
      setCompletedDays(prev => [...prev, currentDay]);
    }
  };

  // Sprint progress
  const sprintStart = Math.floor((currentDay-1)/10)*10+1;
  const sprintDays = Array.from({length:10},(_,i)=>sprintStart+i);
  const pct = Math.round((completedDays.length/100)*100);

  return (
    <div className="min-h-screen bg-[#050510] text-gray-300 font-sans relative overflow-x-hidden">

      {/* ═══ Background atmosphere ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a20] via-[#050510] to-[#080815]" />
        {/* Soft glow orbs */}
        <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-violet-900/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[5%] w-[350px] h-[350px] bg-cyan-900/6 rounded-full blur-[100px]" />
        <div className="absolute top-[60%] left-[50%] w-[300px] h-[300px] bg-emerald-900/5 rounded-full blur-[100px]" />
        <div className="absolute top-[5%] right-[20%] w-[200px] h-[200px] bg-pink-900/4 rounded-full blur-[80px]" />
      </div>

      {/* ═══ Breathing overlay ═══ */}
      {breathActive && (
        <div className="fixed inset-0 z-[100] bg-[#050510]/95 backdrop-blur-xl flex flex-col items-center justify-center"
          onClick={()=>{if(breathCount>=3){setBreathActive(false);setBreathCount(0);}}}>
          <div className={`w-36 h-36 rounded-full border flex items-center justify-center transition-all duration-[4000ms] ${
            breathPhase==="in"?"scale-[1.4] border-cyan-400/30 bg-cyan-500/5 shadow-[0_0_60px_rgba(34,211,238,0.08)]":
            breathPhase==="hold"?"scale-[1.4] border-violet-400/30 bg-violet-500/5 shadow-[0_0_60px_rgba(167,139,250,0.08)]":
            "scale-100 border-white/10 bg-transparent"}`}>
            <span className="text-sm text-gray-400">
              {breathPhase==="in"?"Вдох...":breathPhase==="hold"?"Держим...":"Выдох..."}
            </span>
          </div>
          <div className="mt-8 text-xs text-gray-600">{breathCount} / 5 циклов</div>
          <div className="mt-2 text-[10px] text-gray-700">4 — 2 — 6</div>
          {breathCount>=3 && <div className="mt-8 text-xs text-gray-500 animate-pulse">Нажми чтобы завершить</div>}
        </div>
      )}

      {/* ═══ Content ═══ */}
      <div ref={mainRef} className="relative z-10 mx-auto max-w-[520px] lg:max-w-[900px] min-h-screen flex flex-col">

        {/* ─── Header ─── */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl">{dayData.sprintIcon}</div>
            <div>
              <div className="text-[11px] text-gray-600 tracking-wide">X100 OASIS</div>
              <div className="text-sm font-medium text-white">День {currentDay} · {dayData.sprint}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Radio toggle */}
            <button onClick={toggleRadio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border transition-all ${
                radioPlaying?"bg-violet-500/10 border-violet-500/20 text-violet-400":"bg-white/[0.03] border-white/[0.06] text-gray-600 hover:text-gray-400"}`}>
              <span>{radioPlaying?"⏸":"▶"}</span>
              <span>{RADIO[radioIdx].name}</span>
              {radioPlaying && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
            </button>
            {radioPlaying && (
              <button onClick={nextStation} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">⟳</button>
            )}
            {/* Day picker */}
            <button onClick={()=>setShowDayPicker(!showDayPicker)}
              className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-[10px] text-gray-500 hover:text-white transition-colors">
              {currentDay}
            </button>
          </div>
        </header>

        {/* Day picker dropdown */}
        {showDayPicker && (
          <div className="mx-5 mb-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <div className="text-[10px] text-gray-600 mb-3 uppercase tracking-wider">Выбери день</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({length:100},(_,i)=>i+1).map(d=>(
                <button key={d} onClick={()=>{setCurrentDay(d);setShowDayPicker(false);}}
                  className={`w-7 h-7 rounded-lg text-[10px] transition-all ${
                    d===currentDay?"bg-white/10 text-white font-bold":
                    completedDays.includes(d)?"bg-emerald-500/10 text-emerald-400/70":
                    "text-gray-700 hover:text-gray-400 hover:bg-white/[0.03]"}`}>
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[9px] text-gray-700">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500/30" /> Пройден</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-white/20" /> Текущий</span>
              <span>{completedDays.length}/100 · {pct}%</span>
            </div>
          </div>
        )}

        {/* ─── Main scrollable content (magazine layout) ─── */}
        <main className="flex-1 px-5 pb-24 space-y-5 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-start">

          {/* ═══ LEFT COLUMN (or full on mobile) ═══ */}
          <div className="space-y-5">

            {/* Today's theme card */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{dayData.sprintIcon}</span>
                <div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider">Тема дня</div>
                  <h2 className="text-base font-semibold text-white">{dayData.title}</h2>
                </div>
              </div>
              <p className="text-[13px] text-gray-400 leading-relaxed mb-4">{dayData.desc}</p>
              {/* Mantra */}
              <div className="bg-white/[0.02] rounded-xl p-3 text-center">
                <div className="text-[13px] text-white/60 italic">「 {dayData.mantra} 」</div>
              </div>
            </div>

            {/* Practices */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5 backdrop-blur-sm">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Практики</div>
              <div className="space-y-2">
                {dayData.practices.map((p,i)=>(
                  <button key={i}
                    onClick={()=>{if(p.icon==="🫁"){setBreathActive(true);setBreathCount(0);}}}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.10] transition-all text-left group">
                    <span className="text-base opacity-70 group-hover:opacity-100">{p.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-300">{p.name}</div>
                      <div className="text-[10px] text-gray-600">{p.duration}</div>
                    </div>
                    {p.icon==="🫁" && <span className="text-[10px] text-gray-700">→</span>}
                  </button>
                ))}
              </div>
              {!completedDays.includes(currentDay) ? (
                <button onClick={completeDay}
                  className="mt-4 w-full py-3 rounded-xl bg-emerald-500/8 text-emerald-400/80 text-xs border border-emerald-500/15 hover:bg-emerald-500/15 transition-all">
                  ✓ Отметить день выполненным
                </button>
              ) : (
                <div className="mt-4 text-center text-xs text-emerald-400/50 py-2">✓ День завершён</div>
              )}
            </div>

            {/* Journal */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5 backdrop-blur-sm">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Дневник</div>
              {!journalSaved ? (
                <>
                  <textarea value={journalText} onChange={e=>setJournalText(e.target.value)}
                    className="w-full bg-transparent border-none resize-none text-[13px] text-gray-300 focus:outline-none placeholder:text-gray-700 leading-relaxed"
                    rows={4} placeholder="Что заметил сегодня? Мысль, чувство, наблюдение..." />
                  {journalText.trim() && (
                    <button onClick={()=>{setJournalSaved(true);try{const j=JSON.parse(localStorage.getItem("x100v2_journal")||"{}");j[currentDay]=journalText;localStorage.setItem("x100v2_journal",JSON.stringify(j));}catch{}}}
                      className="mt-2 w-full py-2.5 rounded-xl bg-white/[0.03] text-gray-500 text-xs border border-white/[0.05] hover:bg-white/[0.06] transition-all">
                      Сохранить
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500 italic">✓ Запись сохранена</div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT COLUMN (or continues below on mobile) ═══ */}
          <div className="space-y-5">

            {/* Articles & Reading */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5 backdrop-blur-sm">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">📚 Почитать</div>
              <div className="space-y-2">
                {dayData.articles.map((a,i)=>(
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all group">
                    <span className="text-base opacity-60 group-hover:opacity-100">{a.emoji}</span>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors flex-1 leading-relaxed">{a.title}</span>
                    <span className="text-[10px] text-gray-700 group-hover:text-gray-400">↗</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Sprint progress mini-map */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-gray-600 uppercase tracking-wider">Спринт: {dayData.sprint}</div>
                <div className="text-[10px] text-gray-700">{completedDays.filter(d=>d>=sprintStart&&d<sprintStart+10).length}/10</div>
              </div>
              <div className="flex gap-1.5">
                {sprintDays.map(d=>(
                  <button key={d} onClick={()=>setCurrentDay(d)}
                    className={`flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] transition-all ${
                      d===currentDay?"bg-white/10 text-white border border-white/15":
                      completedDays.includes(d)?"bg-emerald-500/10 text-emerald-400/60":"bg-white/[0.02] text-gray-700 hover:bg-white/[0.04]"}`}>
                    {d%10||10}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick links / explore */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5 backdrop-blur-sm">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">🔗 Ещё</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Медитации", url: "https://www.headspace.com/meditation", icon: "🧘" },
                  { label: "TED Talks", url: "https://www.ted.com/topics/personal+growth", icon: "🎤" },
                  { label: "Stoic Quotes", url: "https://dailystoic.com/stoic-quotes/", icon: "🏛️" },
                  { label: "Breathwork", url: "https://www.wimhofmethod.com/breathing-exercises", icon: "🫁" },
                  { label: "Journaling Guide", url: "https://bulletjournal.com/blogs/faq", icon: "📓" },
                  { label: "Sleep Science", url: "https://www.sleepfoundation.org/", icon: "🌙" },
                ].map((l,i)=>(
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.10] hover:bg-white/[0.03] transition-all">
                    <span className="text-sm opacity-60">{l.icon}</span>
                    <span className="text-[11px] text-gray-500 hover:text-gray-300">{l.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Overall progress */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-600">Общий прогресс</div>
                <div className="text-xs text-white/70">{completedDays.length}/100</div>
              </div>
              <div className="mt-2 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500/50 to-cyan-500/50 transition-all duration-700" style={{width:`${pct}%`}} />
              </div>
            </div>
          </div>
        </main>

        {/* ─── AI Chat bar (fixed bottom) ─── */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="mx-auto max-w-[520px] lg:max-w-[900px]">
            {/* Chat messages (collapsible above input) */}
            {chatMessages.length > 0 && (
              <div className="mx-3 mb-1 max-h-[200px] overflow-y-auto rounded-t-2xl bg-[#0a0a18]/90 backdrop-blur-xl border border-b-0 border-white/[0.06] px-4 py-3">
                <div className="space-y-2.5">
                  {chatMessages.map((m,i)=>(
                    <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                        m.role==="ai"?"bg-white/[0.04] text-gray-400":"bg-violet-500/10 text-violet-300 border border-violet-500/10"}`}>
                        {m.role==="ai" && <span className="text-violet-400/60 text-[10px] font-medium">X100 AI · </span>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}
            {/* Input bar */}
            <div className="mx-3 mb-3 flex items-center gap-2 bg-[#0a0a18]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-4 py-2.5">
              <span className="text-violet-400/50 text-[10px] font-medium shrink-0">X100</span>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                className="flex-1 bg-transparent text-sm text-gray-300 focus:outline-none placeholder:text-gray-700"
                placeholder="Напиши что-нибудь..." />
              {chatInput.trim() && (
                <button onClick={sendChat}
                  className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center text-violet-400 text-xs hover:bg-violet-500/25 transition-all shrink-0">
                  ↑
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; background: transparent; }
        html { -webkit-font-smoothing: antialiased; }
        @media (min-width: 1024px) {
          .lg\\:grid { display: grid !important; }
          .lg\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
