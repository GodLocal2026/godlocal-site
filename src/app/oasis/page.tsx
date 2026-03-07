"use client";
import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   VIEWPORT & ZOOM FIX — injected in layout head
   handled here via useEffect meta tag patch
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   100-DAY PROGRAM
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
      { title: "Дневник наблюдений: с чего начать", url: "https://psychcentral.com/blog/ready-set-journal-64-journaling-prompts-for-self-discovery", emoji: "📓" },
    ],
    practices: [
      { name: "Тишина 10 мин", duration: "10 мин", icon: "🤫" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Запись 3 мыслей", duration: "5 мин", icon: "✍️" },
    ],
    aiGreeting: "День 1. Знаешь, что интересно — большинство людей никогда по-настоящему не наблюдают за собой. Просто живут на автопилоте. Сегодня попробуй 10 минут тишины — не чтобы что-то решить, а просто посмотреть: что там внутри? Что замечаешь?",
  },
  2: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Карта состояния",
    desc: "Оцени каждую сферу жизни. Честно, без приукрашивания. Это твоя стартовая точка — через 100 дней сравнишь.",
    mantra: "Честность — первый шаг к изменению",
    articles: [
      { title: "Колесо жизни: как оценить все сферы", url: "https://www.mindtools.com/aor16a3/the-wheel-of-life", emoji: "🎯" },
      { title: "Почему самооценка всегда немного искажена", url: "https://hbr.org/2018/01/what-self-awareness-really-is-and-how-to-cultivate-it", emoji: "🪞" },
      { title: "Честный аудит жизни: 5 неудобных вопросов", url: "https://markmanson.net/life-audit", emoji: "📋" },
    ],
    practices: [
      { name: "Оценка 5 сфер (1–10)", duration: "10 мин", icon: "📊" },
      { name: "Одно слово для каждой", duration: "5 мин", icon: "🏷️" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
    ],
    aiGreeting: "День 2. Есть интересная идея — что если честно посмотреть на все пять сфер жизни? Тело, разум, деньги, энергия, душа. Поставь каждой оценку от 1 до 10. Без анализа — просто первое число, которое приходит. Какая сфера у тебя сейчас в самом низу?",
  },
  3: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Цифровой рассвет",
    desc: "Первые 2 часа без телефона. Заполни это время чем-то живым: движение, дыхание, запись мыслей.",
    mantra: "Утро определяет день",
    articles: [
      { title: "Что происходит с мозгом при утреннем скроллинге", url: "https://www.forbes.com/health/mind/phone-addiction/", emoji: "📱" },
      { title: "Утренние ритуалы: почему работают", url: "https://www.cnbc.com/morning-routine-tips/", emoji: "☀️" },
      { title: "Допамин и привычки: как перезагрузить систему", url: "https://hubermanlab.com/controlling-your-dopamine-for-motivation-focus-and-satisfaction/", emoji: "⚡" },
    ],
    practices: [
      { name: "2 часа без телефона", duration: "120 мин", icon: "📵" },
      { name: "Дыхание при пробуждении", duration: "5 мин", icon: "🫁" },
      { name: "Утренняя запись", duration: "10 мин", icon: "✍️" },
    ],
    aiGreeting: "День 3 — мне любопытно: как звучит утро без телефона? Многие люди говорят, что боятся тишины по утрам. Другие — что это лучшее, что они сделали. Попробуй сегодня первые два часа без экрана. Что ты поставишь вместо скроллинга?",
  },
  4: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Тело как сигнал",
    desc: "Проведи body scan — 15 минут осознанного внимания к телу. Где напряжение? Где лёгкость?",
    mantra: "Тело всегда говорит правду",
    articles: [
      { title: "Body scan медитация: инструкция", url: "https://www.mindful.org/beginners-body-scan-meditation/", emoji: "🫀" },
      { title: "Соматика: как тело хранит эмоции", url: "https://www.psychologytoday.com/us/basics/somatic-therapy", emoji: "🧬" },
      { title: "Почему мы игнорируем тело и что из этого", url: "https://www.verywellmind.com/mind-body-connection-and-health-2795189", emoji: "💡" },
    ],
    practices: [
      { name: "Body scan 15 мин", duration: "15 мин", icon: "🫀" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Запись ощущений", duration: "5 мин", icon: "✍️" },
    ],
    aiGreeting: "День 4. Тело интереснее, чем кажется — оно часто знает то, что разум ещё не признал. Попробуй body scan: просто пройдись вниманием от макушки до стоп. Без оценки. Где сейчас живёт напряжение?",
  },
  5: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Внутренний критик",
    desc: "Познакомься с голосом, который критикует тебя изнутри. Не борись — слушай. Откуда он?",
    mantra: "Понять — уже наполовину изменить",
    articles: [
      { title: "Внутренний критик: откуда берётся", url: "https://www.psychologytoday.com/us/blog/compassion-matters/201506/6-ways-to-quiet-your-inner-critic", emoji: "🗣️" },
      { title: "Self-compassion — не слабость, а сила", url: "https://self-compassion.org/the-three-elements-of-self-compassion-2/", emoji: "🤍" },
      { title: "Как IFS-терапия работает с частями личности", url: "https://ifs-institute.com/resources/articles", emoji: "🧩" },
    ],
    practices: [
      { name: "Диалог с критиком (письменно)", duration: "15 мин", icon: "✍️" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Аффирмация сочувствия к себе", duration: "5 мин", icon: "🤍" },
    ],
    aiGreeting: "День 5. Интересный вопрос: что говорит тебе твой внутренний голос, когда ты облажался? Как он звучит? Это важно понять — не чтобы заглушить, а чтобы разобраться, откуда он. Что он обычно говорит?",
  },
};

const getDay = (n: number) => {
  if (PROGRAM[n]) return PROGRAM[n];
  const sprintIdx = Math.min(9, Math.floor((n - 1) / 10));
  const sprintNames = ["Пробуждение","Очищение","Дисциплина","Тело","Разум","Деньги","Отношения","Творчество","Миссия","Интеграция"];
  const sprintIcons = ["🌅","🌊","⚡","🔥","🧠","💎","🤝","🎨","🎯","∞"];
  const greetings = [
    `День ${n}. Ты уже ${n} дней в пути — это больше, чем делают 90% людей. Как это ощущается изнутри?`,
    `День ${n}. Интересно: что изменилось за эти ${n} дней? Не глобально — в мелочах, в ощущениях.`,
    `День ${n}. Есть вопрос: если бы ты дал совет себе две недели назад, что бы сказал?`,
    `День ${n}. Что сейчас даётся легко, а что — всё ещё требует усилий?`,
    `День ${n}. Какой момент за последние дни был самым настоящим?`,
  ];
  return {
    sprint: sprintNames[sprintIdx], sprintIcon: sprintIcons[sprintIdx],
    title: `День ${n}`,
    desc: `Спринт "${sprintNames[sprintIdx]}". Продолжай практику — наблюдай, записывай, дыши.`,
    mantra: "Каждый день — один честный шаг",
    articles: [
      { title: "Как построить систему привычек", url: "https://jamesclear.com/atomic-habits-summary", emoji: "🪜" },
      { title: "Нейропластичность: мозг меняется в любом возрасте", url: "https://www.verywellmind.com/what-is-brain-plasticity-2794886", emoji: "🧠" },
      { title: "Осознанность в повседневной жизни", url: "https://www.mindful.org/how-to-practice-mindfulness/", emoji: "🌿" },
      { title: "Дыхательные техники для восстановления", url: "https://www.healthline.com/health/breathing-exercises", emoji: "🫁" },
    ],
    practices: [
      { name: "Практика спринта", duration: "15 мин", icon: sprintIcons[sprintIdx] },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Дневник", duration: "10 мин", icon: "✍️" },
    ],
    aiGreeting: greetings[n % greetings.length],
  };
};

/* ═══════════════════════════════════════════════
   AI RESPONSES — warm, philosophical, varied
   ═══════════════════════════════════════════════ */
const AI_POOLS = {
  good: [
    "Это слышно! Когда внутри что-то светлое — замечаешь ли ты, откуда оно приходит? Хочется понять механизм, чтобы возвращаться туда осознанно.",
    "Хорошее состояние — это тоже информация. Что сегодня сработало? Сон, движение, общение, тишина?",
    "Кайф. Есть такое понятие — «капитализировать состояние». Пока энергия есть — что самое важное можно сделать прямо сейчас?",
    "Огонь — редкое состояние, цени. Кстати, интересный вопрос: ты чаще в потоке один или в окружении людей?",
    "Здорово. А как ты думаешь — это результат конкретных действий или просто пришло само?",
  ],
  bad: [
    "Понимаю. Тяжёлые дни — часть пути, не отклонение от него. Есть что-то одно, что могло бы чуть облегчить сейчас?",
    "Иногда самое честное, что можно сделать — просто признать: сегодня тяжело. Без анализа, без «надо было». Что происходит?",
    "Знаешь, усталость часто говорит не о слабости, а о том, что что-то расходует много энергии. Что сейчас забирает больше всего?",
    "Не нужно быть на подъёме каждый день — это нереально. Что если сегодня просто — дышать и быть? Без целей.",
    "Трудный день — это тоже данные. Тело что-то сигнализирует. Как давно было это ощущение?",
  ],
  question: [
    "Хороший вопрос. Если честно — я думаю, что ответ есть внутри тебя, и ты его уже знаешь. Что говорит первый импульс?",
    "Мне интересно посмотреть на это с другой стороны: а что было бы, если бы ты не беспокоился об этом вообще?",
    "Философски это интересно. Есть концепция «via negativa» — иногда легче понять, чего не хочешь, чем то, чего хочешь. Что точно не подходит?",
    "Знаешь, такие вопросы не всегда решаются — иногда они просто носятся с нами, пока не наступает ясность. Как долго этот вопрос у тебя?",
    "Интересно. Если бы ты уже знал ответ — что бы ты сделал завтра утром?",
  ],
  reflect: [
    "Это резонирует. Хочется спросить: ты замечаешь паттерн — это повторяется или впервые такое?",
    "Глубоко. Записал бы это в дневник — такие мысли часто открывают что-то важное, если дать им место.",
    "Интересное наблюдение. А как ты к этому относишься сейчас — принятие, сопротивление, любопытство?",
    "Это звучит важно. Что чувствуешь, когда говоришь об этом?",
    "Мне кажется, ты уже знаешь, что с этим делать. Что мешает?",
  ],
  default: [
    "Интересно. Расскажи больше — что именно за этим стоит?",
    "Понял тебя. А если посмотреть на это через год — что изменится в восприятии?",
    "Любопытно. Это твоя давняя тема или что-то новое?",
    "Хочу понять глубже. Что ты чувствуешь, когда думаешь об этом?",
    "Это про страх или про что-то другое? Иногда за поверхностным прячется настоящее.",
    "А что бы ты сказал другу, который пришёл к тебе с этим же?",
    "Есть хорошая идея — написать об этом в дневнике прямо сейчас, не обдумывая. Что выйдет?",
  ],
};

const classifyMsg = (msg: string) => {
  const t = msg.toLowerCase();
  if (["хорошо","отлично","круто","огонь","класс","кайф","энергия","счастли","рад","радостн","супер","легко","поток"].some(w=>t.includes(w))) return "good";
  if (["плохо","тяжело","устал","сложно","грустн","лень","не хочу","тревог","апати","пусто","бессмысл"].some(w=>t.includes(w))) return "bad";
  if (t.includes("?") || ["почему","зачем","как","что если","можно ли","стоит ли"].some(w=>t.includes(w))) return "question";
  if (t.length > 60) return "reflect";
  return "default";
};

const getAI = (msg: string) => {
  const pool = AI_POOLS[classifyMsg(msg) as keyof typeof AI_POOLS];
  return pool[Math.floor(Math.random() * pool.length)];
};

/* ═══════════════════════════════════════════════
   RADIO
   ═══════════════════════════════════════════════ */
const RADIO = [
  { name: "Lofi Focus", url: "https://streams.ilovemusic.de/iloveradio17.mp3", icon: "🎧" },
  { name: "Chill Ambient", url: "https://ice1.somafm.com/dronezone-128-mp3", icon: "🌙" },
  { name: "Nature", url: "https://ice1.somafm.com/fluid-128-mp3", icon: "🌿" },
];

/* ═══════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════ */
export default function X100Oasis() {
  const [currentDay, setCurrentDay] = useState(1);
  const [messages, setMessages] = useState<{role:"ai"|"user";text:string}[]>([]);
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
  const [radioIdx, setRadioIdx] = useState(0);
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in"|"hold"|"out">("in");
  const [breathCount, setBreathCount] = useState(0);
  const [journal, setJournal] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  // keyboard height tracking
  const [kbHeight, setKbHeight] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dayData = getDay(currentDay);

  /* ── Fix zoom: inject viewport meta ── */
  useEffect(() => {
    // Prevent pinch zoom
    const meta = document.querySelector("meta[name=viewport]");
    const content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
    if (meta) { meta.setAttribute("content", content); }
    else {
      const m = document.createElement("meta");
      m.name = "viewport"; m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  /* ── Keyboard height via visualViewport ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbHeight(kb);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  /* ── Load / save ── */
  useEffect(() => {
    try {
      const c = localStorage.getItem("x100v3_completed"); if (c) setCompleted(JSON.parse(c));
      const d = localStorage.getItem("x100v3_day"); if (d) setCurrentDay(parseInt(d));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("x100v3_completed", JSON.stringify(completed));
    localStorage.setItem("x100v3_day", currentDay.toString());
  }, [completed, currentDay]);

  /* ── AI greeting on day change ── */
  useEffect(() => {
    setMessages([{ role: "ai", text: dayData.aiGreeting }]);
    setJournal(""); setJournalSaved(false);
  }, [currentDay]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, aiTyping]);

  /* ── Breathing ── */
  useEffect(() => {
    if (!breathActive) return;
    const phases: {phase:"in"|"hold"|"out";dur:number}[] = [{phase:"in",dur:4000},{phase:"hold",dur:2000},{phase:"out",dur:6000}];
    let idx = 0, timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setBreathPhase(phases[idx].phase);
      timer = setTimeout(() => { idx=(idx+1)%3; if(idx===0) setBreathCount(c=>c+1); cycle(); }, phases[idx].dur);
    };
    cycle(); return () => clearTimeout(timer);
  }, [breathActive]);

  /* ── Radio ── */
  const toggleRadio = () => {
    if (!audioRef.current) { audioRef.current = new Audio(RADIO[radioIdx].url); audioRef.current.volume = 0.25; }
    if (radioOn) { audioRef.current.pause(); }
    else { audioRef.current.src = RADIO[radioIdx].url; audioRef.current.play().catch(()=>{}); }
    setRadioOn(!radioOn);
  };
  const nextStation = () => {
    const n = (radioIdx+1)%RADIO.length; setRadioIdx(n);
    if (audioRef.current && radioOn) { audioRef.current.src = RADIO[n].url; audioRef.current.play().catch(()=>{}); }
  };

  /* ── Chat send ── */
  const send = () => {
    const txt = input.trim(); if (!txt) return;
    setMessages(p=>[...p,{role:"user",text:txt}]);
    setInput(""); setAiTyping(true);
    setTimeout(() => {
      setAiTyping(false);
      setMessages(p=>[...p,{role:"ai",text:getAI(txt)}]);
    }, 900 + Math.random()*1400);
  };

  /* ── Complete day ── */
  const completeDay = () => {
    if (!completed.includes(currentDay)) setCompleted(p=>[...p, currentDay]);
  };

  const sprintStart = Math.floor((currentDay-1)/10)*10+1;
  const sprintDays = Array.from({length:10},(_,i)=>sprintStart+i);
  const pct = Math.round((completed.length/100)*100);

  return (
    <>
      {/* ── Global CSS ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { overscroll-behavior: none; }
        ::-webkit-scrollbar { display: none; }
        body { touch-action: pan-y; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .35s ease-out; }
        @keyframes pulse2 { 0%,100%{opacity:.5} 50%{opacity:1} }
        .pulse2 { animation: pulse2 1.4s ease-in-out infinite; }
      `}</style>

      <div className="min-h-[100dvh] bg-[#050510] text-gray-300 font-sans" style={{paddingBottom: kbHeight > 0 ? kbHeight + 64 : 80}}>

        {/* ── BG glows ── */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-violet-800/7 rounded-full blur-[140px]" />
          <div className="absolute top-[55%] -right-20 w-[400px] h-[400px] bg-cyan-800/5 rounded-full blur-[120px]" />
          <div className="absolute top-[30%] left-[40%] w-[300px] h-[300px] bg-emerald-800/4 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-[20%] w-[350px] h-[250px] bg-pink-900/3 rounded-full blur-[100px]" />
        </div>

        {/* ── Breath overlay ── */}
        {breathActive && (
          <div className="fixed inset-0 z-[200] bg-[#050510]/97 backdrop-blur-2xl flex flex-col items-center justify-center"
            onClick={()=>{if(breathCount>=3){setBreathActive(false);setBreathCount(0);}}}>
            <div className={`w-36 h-36 rounded-full border flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${
              breathPhase==="in"?"scale-[1.4] border-cyan-400/25 bg-cyan-500/4 shadow-[0_0_80px_rgba(34,211,238,0.07)]":
              breathPhase==="hold"?"scale-[1.4] border-violet-400/25 bg-violet-500/4 shadow-[0_0_80px_rgba(167,139,250,0.07)]":
              "scale-100 border-white/8"}`}>
              <span className="text-sm text-gray-500">{breathPhase==="in"?"Вдох":breathPhase==="hold"?"Пауза":"Выдох"}</span>
            </div>
            <p className="mt-8 text-xs text-gray-700">{breathCount} / 5 циклов · 4–2–6</p>
            {breathCount>=3 && <p className="mt-4 text-[11px] text-gray-600 pulse2">Нажми чтобы завершить</p>}
          </div>
        )}

        <div className="relative z-10 mx-auto max-w-[540px] lg:max-w-[920px]">

          {/* ── Header ── */}
          <header className="flex items-center justify-between px-5 pt-6 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{dayData.sprintIcon}</span>
              <div>
                <p className="text-[10px] tracking-widest text-gray-700 uppercase">X100 Oasis</p>
                <p className="text-sm font-medium text-white leading-tight">День {currentDay} · {dayData.sprint}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Radio */}
              <button onClick={toggleRadio}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] border transition-all ${radioOn
                  ? "border-violet-400/20 bg-violet-500/8 text-violet-300"
                  : "border-white/[0.05] text-gray-600 hover:text-gray-400"}`}>
                <span>{radioOn?"⏸":"▶"}</span>
                <span className="hidden sm:inline">{RADIO[radioIdx].name}</span>
                {radioOn && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 pulse2" />}
              </button>
              {radioOn && <button onClick={nextStation} className="text-[11px] text-gray-600 hover:text-gray-400 px-1">⟳</button>}
              {/* Day picker btn */}
              <button onClick={()=>setShowPicker(!showPicker)}
                className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-gray-500 hover:text-white hover:border-white/10 transition-all">
                {currentDay}
              </button>
            </div>
          </header>

          {/* ── Day picker ── */}
          {showPicker && (
            <div className="mx-5 mb-4 p-4 rounded-2xl bg-[#0c0c1e]/90 border border-white/[0.07] backdrop-blur-xl fu">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Выбери день</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({length:100},(_,i)=>i+1).map(d=>(
                  <button key={d} onClick={()=>{setCurrentDay(d);setShowPicker(false);}}
                    className={`h-7 rounded-lg text-[10px] transition-all ${
                      d===currentDay?"bg-white/10 text-white font-semibold":
                      completed.includes(d)?"bg-emerald-500/10 text-emerald-500/50":"text-gray-700 hover:text-gray-400 hover:bg-white/[0.03]"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-[9px] text-gray-700">
                <span><span className="inline-block w-2 h-2 mr-1 rounded bg-emerald-500/30 align-middle"/>пройден</span>
                <span><span className="inline-block w-2 h-2 mr-1 rounded bg-white/20 align-middle"/>текущий</span>
                <span className="ml-auto">{completed.length}/100 · {pct}%</span>
              </div>
            </div>
          )}

          {/* ── Main grid ── */}
          <main className="px-5 pb-4 grid gap-4 lg:grid-cols-2">

            {/* LEFT COL */}
            <div className="space-y-4">

              {/* Theme card */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 fu">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl mt-0.5">{dayData.sprintIcon}</span>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{dayData.sprint}</p>
                    <h2 className="text-base font-semibold text-white">{dayData.title}</h2>
                  </div>
                </div>
                <p className="text-[13px] text-gray-400 leading-[1.7] mb-4">{dayData.desc}</p>
                <div className="rounded-xl bg-white/[0.015] px-4 py-3 text-center">
                  <p className="text-[12px] text-white/50 italic leading-relaxed">「 {dayData.mantra} 」</p>
                </div>
              </div>

              {/* Practices */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Практики</p>
                <div className="space-y-2">
                  {dayData.practices.map((p,i)=>(
                    <button key={i}
                      onClick={()=>{if(p.icon==="🫁"){setBreathActive(true);setBreathCount(0);}}}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-all text-left group">
                      <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-gray-300 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-600">{p.duration}</p>
                      </div>
                      {p.icon==="🫁"&&<span className="text-[10px] text-gray-700">→</span>}
                    </button>
                  ))}
                </div>
                {!completed.includes(currentDay) ? (
                  <button onClick={completeDay} className="mt-4 w-full py-3 rounded-xl bg-emerald-500/6 text-emerald-400/70 text-[12px] border border-emerald-500/12 hover:bg-emerald-500/12 transition-all">
                    ✓ День завершён
                  </button>
                ) : (
                  <p className="mt-4 text-center text-[11px] text-emerald-400/40 py-2">✓ Выполнено</p>
                )}
              </div>

              {/* Journal */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Дневник</p>
                {!journalSaved ? (
                  <>
                    <textarea value={journal} onChange={e=>setJournal(e.target.value)}
                      className="w-full bg-transparent resize-none text-[13px] text-gray-300 focus:outline-none placeholder:text-gray-700 leading-relaxed"
                      rows={4} placeholder="Что заметил сегодня? Мысль, ощущение, инсайт..." />
                    {journal.trim() && (
                      <button
                        onClick={()=>{setJournalSaved(true);try{const j=JSON.parse(localStorage.getItem("x100v3_journal")||"{}");j[currentDay]=journal;localStorage.setItem("x100v3_journal",JSON.stringify(j));}catch{}}}
                        className="mt-2 w-full py-2.5 rounded-xl bg-white/[0.03] text-gray-500 text-[11px] border border-white/[0.04] hover:bg-white/[0.05] transition-all">
                        Сохранить
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-gray-600 italic">✓ Запись сохранена</p>
                )}
              </div>
            </div>

            {/* RIGHT COL */}
            <div className="space-y-4">

              {/* Articles */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">📚 Почитать</p>
                <div className="space-y-2">
                  {dayData.articles.map((a,i)=>(
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-all group">
                      <span className="text-base opacity-50 group-hover:opacity-90 transition-opacity shrink-0">{a.emoji}</span>
                      <span className="text-[12px] text-gray-500 group-hover:text-gray-200 transition-colors leading-relaxed flex-1">{a.title}</span>
                      <span className="text-[10px] text-gray-700 group-hover:text-gray-400 shrink-0">↗</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Sprint minimap */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 fu">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{dayData.sprint}</p>
                  <p className="text-[10px] text-gray-700">{completed.filter(d=>d>=sprintStart&&d<sprintStart+10).length}/10</p>
                </div>
                <div className="flex gap-1.5">
                  {sprintDays.map(d=>(
                    <button key={d} onClick={()=>setCurrentDay(d)}
                      className={`flex-1 h-8 rounded-lg text-[10px] transition-all ${
                        d===currentDay?"bg-white/10 text-white border border-white/15":
                        completed.includes(d)?"bg-emerald-500/10 text-emerald-500/50":"bg-white/[0.015] text-gray-700 hover:bg-white/[0.04]"}`}>
                      {((d-1)%10)+1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">🔗 Ресурсы</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {label:"Медитации",url:"https://www.headspace.com/meditation",icon:"🧘"},
                    {label:"TED Talks",url:"https://www.ted.com/topics/personal+growth",icon:"🎤"},
                    {label:"Stoic Quotes",url:"https://dailystoic.com/stoic-quotes/",icon:"🏛️"},
                    {label:"Breathwork",url:"https://www.wimhofmethod.com/breathing-exercises",icon:"🫁"},
                    {label:"Sleep Science",url:"https://www.sleepfoundation.org/",icon:"🌙"},
                    {label:"Atomic Habits",url:"https://jamesclear.com/atomic-habits",icon:"⚗️"},
                  ].map((l,i)=>(
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/10 hover:bg-white/[0.03] transition-all">
                      <span className="text-sm opacity-50">{l.icon}</span>
                      <span className="text-[11px] text-gray-600 hover:text-gray-300">{l.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 fu">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-600">Общий прогресс</p>
                  <p className="text-[10px] text-gray-600">{completed.length}/100 · {pct}%</p>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500/40 to-cyan-400/40 transition-all duration-700" style={{width:`${pct}%`}} />
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* ── Fixed chat bar — keyboard-aware ── */}
        <div className="fixed left-0 right-0 z-50" style={{bottom: kbHeight}}>
          <div className="mx-auto max-w-[540px] lg:max-w-[920px] px-3 pb-3">
            {/* Messages window */}
            {messages.length > 0 && (
              <div className="mb-1 max-h-[180px] overflow-y-auto rounded-t-2xl bg-[#0a0a1c]/95 backdrop-blur-2xl border border-b-0 border-white/[0.07] px-4 py-3">
                <div className="space-y-2">
                  {messages.map((m,i)=>(
                    <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"} fu`}>
                      <div className={`max-w-[82%] px-3.5 py-2 rounded-xl text-[12px] leading-relaxed ${
                        m.role==="ai"
                          ?"bg-white/[0.03] text-gray-400 border border-white/[0.04]"
                          :"bg-violet-500/10 text-violet-200 border border-violet-500/10"}`}>
                        {m.role==="ai" && <span className="text-violet-400/50 text-[10px] font-medium mr-1">AI·</span>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {aiTyping && (
                    <div className="flex justify-start fu">
                      <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-[12px] text-gray-600">
                        <span className="inline-flex gap-1">
                          <span className="pulse2" style={{animationDelay:"0ms"}}>·</span>
                          <span className="pulse2" style={{animationDelay:"200ms"}}>·</span>
                          <span className="pulse2" style={{animationDelay:"400ms"}}>·</span>
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 bg-[#0a0a1c]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 py-3">
              <span className="text-violet-400/40 text-[10px] font-semibold shrink-0 tracking-wider">X100</span>
              <input
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={false}
                className="flex-1 bg-transparent text-[13px] text-gray-300 focus:outline-none placeholder:text-gray-700 min-w-0"
                placeholder="Как ты сегодня?..."
              />
              {input.trim() && (
                <button onPointerDown={e=>{e.preventDefault();send();}}
                  className="w-7 h-7 rounded-full bg-violet-500/15 border border-violet-500/15 flex items-center justify-center text-violet-400 text-xs hover:bg-violet-500/25 transition-all shrink-0">
                  ↑
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
