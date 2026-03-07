"use client";
import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   100-DAY PROGRAM
   ═══════════════════════════════════════════════ */
const PROGRAM: Record<number, {
  sprint: string; sprintIcon: string; title: string; desc: string; mantra: string;
  articles: { title: string; url: string; emoji: string }[];
  practices: { name: string; duration: string; icon: string }[];
  agentGreeting: { text: string; actions: string[] };
}> = {
  1: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Наблюдатель",
    desc: "Сегодня ты учишься наблюдать. Не менять, не бороться — просто замечать. 10 минут тишины. Что ты слышишь внутри?",
    mantra: "Я наблюдаю, не реагирую",
    articles: [
      { title: "Нейронаука осознанности — mindful.org", url: "https://www.mindful.org/the-science-of-mindfulness/", emoji: "🧠" },
      { title: "10-минутная медитация для старта", url: "https://www.headspace.com/meditation/10-minute-meditation", emoji: "🧘" },
      { title: "Как тишина физически меняет мозг — BBC", url: "https://www.bbc.com/future/article/20170525-the-surprising-benefits-of-silence", emoji: "🤫" },
      { title: "64 вопроса для дневника наблюдений", url: "https://psychcentral.com/blog/ready-set-journal-64-journaling-prompts-for-self-discovery", emoji: "📓" },
    ],
    practices: [
      { name: "Тишина 10 мин", duration: "10 мин", icon: "🤫" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Запись 3 мыслей", duration: "5 мин", icon: "✍️" },
    ],
    agentGreeting: {
      text: "День 1. Запускаю твой маршрут. Сегодняя задача — 10 минут тишины и наблюдение без оценок. Вот что тебе нужно конкретно:",
      actions: ["Поставь таймер на 10 мин сейчас", "Открой статью о нейронауке тишины", "Запиши 3 наблюдения в дневнике ниже"],
    },
  },
  2: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Карта состояния",
    desc: "Оцени каждую сферу жизни. Честно, без приукрашивания. Это твоя стартовая точка — через 100 дней сравнишь.",
    mantra: "Честность — первый шаг к изменению",
    articles: [
      { title: "Колесо жизни — MindTools", url: "https://www.mindtools.com/aor16a3/the-wheel-of-life", emoji: "🎯" },
      { title: "Что такое самоосознанность — HBR", url: "https://hbr.org/2018/01/what-self-awareness-really-is-and-how-to-cultivate-it", emoji: "🪞" },
      { title: "Честный аудит жизни — Mark Manson", url: "https://markmanson.net/life-audit", emoji: "📋" },
    ],
    practices: [
      { name: "Оценка 5 сфер (1–10)", duration: "10 мин", icon: "📊" },
      { name: "Одно слово для каждой", duration: "5 мин", icon: "🏷️" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
    ],
    agentGreeting: {
      text: "День 2 — аудит. Сейчас делаем карту: ставишь оценки пяти сферам (1–10), без долгих раздумий. Первое число — самое честное. Советую начать с этого:",
      actions: ["Тело — оцени прямо сейчас", "Открой колесо жизни для примера", "Запиши слабейшую сферу — её и прокачаем"],
    },
  },
  3: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Цифровой рассвет",
    desc: "Первые 2 часа без телефона. Заполни это время чем-то живым: движение, дыхание, запись мыслей.",
    mantra: "Утро определяет день",
    articles: [
      { title: "Утренний скроллинг и мозг — Forbes Health", url: "https://www.forbes.com/health/mind/phone-addiction/", emoji: "📱" },
      { title: "Утренние ритуалы продуктивных людей — CNBC", url: "https://www.cnbc.com/morning-routine-tips/", emoji: "☀️" },
      { title: "Допамин и привычки — Huberman Lab", url: "https://hubermanlab.com/controlling-your-dopamine-for-motivation-focus-and-satisfaction/", emoji: "⚡" },
    ],
    practices: [
      { name: "2 часа без телефона", duration: "120 мин", icon: "📵" },
      { name: "Дыхание при пробуждении", duration: "5 мин", icon: "🫁" },
      { name: "Утренняя запись", duration: "10 мин", icon: "✍️" },
    ],
    agentGreeting: {
      text: "День 3. Рекомендую: завтра утром телефон — только через 2 часа после пробуждения. Это конкретно меняет уровень тревоги. Чтобы не было скуки — план:",
      actions: ["5 мин дыхания сразу после пробуждения", "Запиши 5 вещей, за которые благодарен", "Прочти статью про допамин — она объяснит зачем"],
    },
  },
  4: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Тело как сигнал",
    desc: "Проведи body scan — 15 минут осознанного внимания к телу. Где напряжение? Где лёгкость?",
    mantra: "Тело всегда говорит правду",
    articles: [
      { title: "Body scan медитация — Mindful.org", url: "https://www.mindful.org/beginners-body-scan-meditation/", emoji: "🫀" },
      { title: "Соматика: тело хранит эмоции", url: "https://www.psychologytoday.com/us/basics/somatic-therapy", emoji: "🧬" },
      { title: "Связь тела и разума — Verywell Mind", url: "https://www.verywellmind.com/mind-body-connection-and-health-2795189", emoji: "💡" },
    ],
    practices: [
      { name: "Body scan 15 мин", duration: "15 мин", icon: "🫀" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Запись телесных ощущений", duration: "5 мин", icon: "✍️" },
    ],
    agentGreeting: {
      text: "День 4. Body scan — быстрый способ поймать, что реально происходит. Ложишься, закрываешь глаза, проходишь вниманием сверху вниз. Конкретный план:",
      actions: ["Нажми «Дыхание 4-2-6» для разогрева", "Затем 15 мин body scan лёжа", "Запиши: где было напряжение?"],
    },
  },
  5: {
    sprint: "Пробуждение", sprintIcon: "🌅", title: "Внутренний критик",
    desc: "Познакомься с голосом, который критикует тебя изнутри. Не борись — слушай. Откуда он?",
    mantra: "Понять — уже наполовину изменить",
    articles: [
      { title: "6 способов успокоить внутреннего критика", url: "https://www.psychologytoday.com/us/blog/compassion-matters/201506/6-ways-to-quiet-your-inner-critic", emoji: "🗣️" },
      { title: "Self-compassion — не слабость, а инструмент", url: "https://self-compassion.org/the-three-elements-of-self-compassion-2/", emoji: "🤍" },
      { title: "IFS терапия: части личности", url: "https://ifs-institute.com/resources/articles", emoji: "🧩" },
    ],
    practices: [
      { name: "Диалог с критиком (письменно)", duration: "15 мин", icon: "✍️" },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Аффирмация сочувствия к себе", duration: "5 мин", icon: "🤍" },
    ],
    agentGreeting: {
      text: "День 5. Внутренний критик — это реальная сила, её нужно понять, а не давить. Предлагаю конкретное упражнение прямо сейчас:",
      actions: ["Напиши в дневнике: «Мой критик говорит...»", "Прочти статью про self-compassion", "Замени одну критику на нейтральное наблюдение"],
    },
  },
};

const getDay = (n: number) => {
  if (PROGRAM[n]) return PROGRAM[n];
  const sprintIdx = Math.min(9, Math.floor((n - 1) / 10));
  const sprintNames = ["Пробуждение","Очищение","Дисциплина","Тело","Разум","Деньги","Отношения","Творчество","Миссия","Интеграция"];
  const sprintIcons = ["🌅","🌊","⚡","🔥","🧠","💎","🤝","🎨","🎯","∞"];
  const greetingTemplates = [
    { text: `День ${n}. ${n} дней — это серьёзно. Рекомендую сегодня сфокусироваться на одном: выбери практику, выполни, запиши.`, actions:["Открой практику дня","Запиши результат в дневнике","Отметь день выполненным"] },
    { text: `День ${n}. Предлагаю план на сегодня: утром дыхание, днём статья по теме, вечером запись в дневнике.`, actions:["Утром: дыхание 4-2-6","Прочти одну статью ниже","Вечером: дневник"] },
    { text: `День ${n}. Продолжаем спринт "${sprintNames[sprintIdx]}". Конкретный шаг сегодня: 15 минут практики без отвлечений.`, actions:["15 мин практики без телефона","Запиши одно наблюдение","Отметь прогресс"] },
  ];
  return {
    sprint: sprintNames[sprintIdx], sprintIcon: sprintIcons[sprintIdx],
    title: `День ${n}`,
    desc: `Спринт "${sprintNames[sprintIdx]}". Продолжай практику — наблюдай, записывай, дыши.`,
    mantra: "Каждый день — один честный шаг",
    articles: [
      { title: "Система привычек — James Clear", url: "https://jamesclear.com/atomic-habits-summary", emoji: "🪜" },
      { title: "Нейропластичность: мозг меняется — Verywell", url: "https://www.verywellmind.com/what-is-brain-plasticity-2794886", emoji: "🧠" },
      { title: "Осознанность каждый день — Mindful", url: "https://www.mindful.org/how-to-practice-mindfulness/", emoji: "🌿" },
      { title: "Дыхательные техники — Healthline", url: "https://www.healthline.com/health/breathing-exercises", emoji: "🫁" },
    ],
    practices: [
      { name: "Практика спринта", duration: "15 мин", icon: sprintIcons[sprintIdx] },
      { name: "Дыхание 4-2-6", duration: "5 мин", icon: "🫁" },
      { name: "Дневник", duration: "10 мин", icon: "✍️" },
    ],
    agentGreeting: greetingTemplates[n % greetingTemplates.length],
  };
};

/* ═══════════════════════════════════════════════
   AGENT X100 — proactive, action-oriented
   ═══════════════════════════════════════════════ */

type AgentMode = "plan" | "advice" | "challenge" | "reflect" | "boost" | "default";

function classifyIntent(msg: string): AgentMode {
  const t = msg.toLowerCase();
  if (["план","расписание","как начать","с чего","не знаю с чего","помоги","помогите"].some(w=>t.includes(w))) return "plan";
  if (["совет","посоветуй","что делать","как","помогает ли","стоит"].some(w=>t.includes(w))) return "advice";
  if (["лень","не хочу","откладываю","прокрастина","не могу","сложно","устал","опустились руки"].some(w=>t.includes(w))) return "challenge";
  if (t.includes("?") || ["думаю","кажется","чувствую","заметил"].some(w=>t.includes(w))) return "reflect";
  if (["хорошо","отлично","круто","получилось","сделал","выполнил","получается","рад"].some(w=>t.includes(w))) return "boost";
  return "default";
}

const AGENT_RESPONSES: Record<AgentMode, (msg: string) => string> = {
  plan: (msg) => {
    const topics = ["утро","медитац","питани","спорт","сон","продуктивн","деньги","отношени"];
    const topic = topics.find(t => msg.toLowerCase().includes(t)) || "твою цель";
    return `Сделано. Вот конкретный план для "${topic}":\n\n1. Первые 3 дня — только наблюдение, без изменений. Фиксируй что есть.\n2. Дни 4–7 — одно маленькое действие в день (5 мин максимум).\n3. Неделя 2 — добавляй второе действие только если первое стало автоматическим.\n\nГлавное правило: не добавляй следующее, пока предыдущее не стало привычкой. Начинаем?`;
  },
  advice: (msg) => {
    const t = msg.toLowerCase();
    if (t.includes("сон")) return "По сну: самое сильное — фиксированное время подъёма, даже в выходные. Не раньше в постель, а раньше вставать. Экран за 40 мин до сна убирай. Попробуй 7 дней — результат будет заметен.";
    if (t.includes("медит") || t.includes("практик")) return "По медитации: начни с 5 минут утром, прямо в кровати. Не нужно позы, мантры, тишины. Просто закрой глаза и считай дыхание 1-2-3... до 10, потом сначала. Если отвлёкся — не страшно, вернись. Через 10 дней увеличь до 10 мин.";
    if (t.includes("энерг") || t.includes("усталост")) return "По энергии: три рычага — сон (7-8ч строго), движение (15 мин прогулки после обеда), и первый приём пищи не раньше 10 утра. Попробуй только первый пункт — нормализуй сон. Остальное подтянется само.";
    return "Конкретный совет: выбери одно действие, которое ты точно можешь сделать завтра утром за 5 минут. Запиши его прямо сейчас в дневнике. Не план — одно конкретное действие. Какое?";
  },
  challenge: (_msg) => {
    const options = [
      "Лень — это сигнал, не враг. Обычно она говорит: «слишком большой шаг». Сделай его в 10 раз меньше. Вместо 30 мин медитации — 2 минуты. Серьёзно. Начни прямо сейчас — 2 минуты закрытых глаз. Потом расскажи что было.",
      "Откладывание — это защита от несовершенства. Мозг боится сделать плохо, поэтому не делает вообще. Лечится одним: начать хуже, чем планировал. Открой дневник, напиши одно слово. Готово — ты начал.",
      "Усталость бывает двух типов: от действий и от бездействия. Второй тип лечится маленьким движением вперёд. Предлагаю: прямо сейчас — 3 глубоких выдоха. Потом скажи мне что чувствуешь.",
    ];
    return options[Math.floor(Math.random()*options.length)];
  },
  reflect: (_msg) => {
    const options = [
      "Важное наблюдение. Предлагаю закрепить: запиши это в дневнике ниже прямо сейчас — одним предложением. Записи через 2-3 недели часто показывают паттерн, который иначе не заметишь.",
      "Это стоит разобрать глубже. Есть упражнение: задай себе 5 раз вопрос «почему?» по этой теме. Каждый ответ — основа для следующего почему. На 4-5 итерации обычно появляется настоящая причина.",
      "Хорошее наблюдение. Рекомендую: возьми статью из сегодняшнего чтения — там есть прямой контекст на эту тему. Потом поделись что нашёл.",
    ];
    return options[Math.floor(Math.random()*options.length)];
  },
  boost: (_msg) => {
    const options = [
      "Фиксирую победу. Это важно — мозг учится от подкрепления, не от давления. Что именно сработало сегодня? Запиши в дневнике — это станет твоим инструментом на тяжёлые дни.",
      "Хорошо сделано. Следующий шаг: пока есть энергия — сделай ещё одно маленькое действие из практик дня. Не больше 5 минут. Два выполненных пункта — это уже день с двойной отдачей.",
      "Отлично. Предлагаю зафиксировать — нажми «День завершён» ниже и запиши в дневнике одно слово: как себя чувствуешь сейчас. Через 100 дней это будет интересно перечитать.",
    ];
    return options[Math.floor(Math.random()*options.length)];
  },
  default: (_msg) => {
    const options = [
      "Принял. Вот что предлагаю конкретно: открой одну статью из сегодняшнего списка — 10 минут чтения часто меняют взгляд на день. Какая тема сейчас откликается больше всего?",
      "Понял. Если хочешь — могу дать конкретный план действий на ближайшие 3 дня по любой теме. Просто скажи: тело, разум, энергия, деньги или отношения.",
      "Слышу тебя. Моя рекомендация: прямо сейчас — нажми на практику дня и выполни её. Разговор после действия всегда другой качество.",
      "Хорошо. Предлагаю конкретный следующий шаг: напиши в дневнике ниже что происходит — 3-5 предложений. Это не для меня, это для тебя через месяц.",
    ];
    return options[Math.floor(Math.random()*options.length)];
  },
};

/* ═══════════════════════════════════════════════
   RADIO
   ═══════════════════════════════════════════════ */
const RADIO = [
  { name: "Lofi Focus", url: "https://streams.ilovemusic.de/iloveradio17.mp3" },
  { name: "Chill Ambient", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { name: "Nature", url: "https://ice1.somafm.com/fluid-128-mp3" },
];

/* ═══════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════ */
export default function X100Oasis() {
  const [currentDay, setCurrentDay] = useState(1);
  const [messages, setMessages] = useState<{role:"agent"|"user";text:string}[]>([]);
  const [input, setInput] = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const [radioOn, setRadioOn] = useState(false);
  const [radioIdx, setRadioIdx] = useState(0);
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in"|"hold"|"out">("in");
  const [breathCount, setBreathCount] = useState(0);
  const [journal, setJournal] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const [chatOpen, setChatOpen] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dayData = getDay(currentDay);

  /* ── Viewport zoom fix ── */
  useEffect(() => {
    const meta = document.querySelector("meta[name=viewport]");
    const c = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
    if (meta) meta.setAttribute("content", c);
    else { const m = document.createElement("meta"); m.name="viewport"; m.content=c; document.head.appendChild(m); }
  }, []);

  /* ── Keyboard height ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const upd = () => setKbHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", upd);
    vv.addEventListener("scroll", upd);
    return () => { vv.removeEventListener("resize",upd); vv.removeEventListener("scroll",upd); };
  }, []);

  /* ── Load/save ── */
  useEffect(() => {
    try {
      const c = localStorage.getItem("x100v4_completed"); if(c) setCompleted(JSON.parse(c));
      const d = localStorage.getItem("x100v4_day"); if(d) setCurrentDay(parseInt(d));
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("x100v4_completed", JSON.stringify(completed)); }, [completed]);
  useEffect(() => { localStorage.setItem("x100v4_day", currentDay.toString()); }, [currentDay]);

  /* ── Agent greeting on day change ── */
  useEffect(() => {
    const g = dayData.agentGreeting;
    setMessages([
      { role:"agent", text: g.text },
      { role:"agent", text: "→ " + g.actions.join("\n→ ") },
    ]);
    setJournal(""); setJournalSaved(false);
  }, [currentDay]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, agentTyping]);

  /* ── Breathing ── */
  useEffect(() => {
    if (!breathActive) return;
    const phases: {phase:"in"|"hold"|"out";dur:number}[] = [{phase:"in",dur:4000},{phase:"hold",dur:2000},{phase:"out",dur:6000}];
    let idx=0; let timer: ReturnType<typeof setTimeout>;
    const cycle = () => { setBreathPhase(phases[idx].phase); timer=setTimeout(()=>{idx=(idx+1)%3;if(idx===0)setBreathCount(c=>c+1);cycle();},phases[idx].dur); };
    cycle(); return ()=>clearTimeout(timer);
  }, [breathActive]);

  /* ── Radio ── */
  const toggleRadio = () => {
    if (!audioRef.current) { audioRef.current = new Audio(RADIO[radioIdx].url); audioRef.current.volume=0.2; }
    if (radioOn) audioRef.current.pause();
    else { audioRef.current.src=RADIO[radioIdx].url; audioRef.current.play().catch(()=>{}); }
    setRadioOn(!radioOn);
  };
  const nextStation = () => {
    const n=(radioIdx+1)%RADIO.length; setRadioIdx(n);
    if (audioRef.current && radioOn) { audioRef.current.src=RADIO[n].url; audioRef.current.play().catch(()=>{}); }
  };

  /* ── Send ── */
  const send = () => {
    const txt = input.trim(); if (!txt) return;
    setMessages(p=>[...p,{role:"user",text:txt}]);
    setInput(""); setAgentTyping(true); setChatOpen(true);
    setTimeout(() => {
      setAgentTyping(false);
      const mode = classifyIntent(txt);
      setMessages(p=>[...p,{role:"agent",text:AGENT_RESPONSES[mode](txt)}]);
    }, 600 + Math.random()*1000);
  };

  const completeDay = () => { if(!completed.includes(currentDay)) setCompleted(p=>[...p,currentDay]); };
  const sprintStart = Math.floor((currentDay-1)/10)*10+1;
  const sprintDays = Array.from({length:10},(_,i)=>sprintStart+i);
  const pct = Math.round((completed.length/100)*100);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        html,body { overscroll-behavior:none; margin:0; padding:0; }
        ::-webkit-scrollbar { display:none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .3s ease-out; }
        @keyframes pulse2 { 0%,100%{opacity:.4} 50%{opacity:1} }
        .p2 { animation:pulse2 1.4s ease-in-out infinite; }
        @keyframes bgPan { 0%{background-position:0% 0%} 100%{background-position:100% 100%} }
      `}</style>

      <div className="min-h-[100dvh] text-gray-200 font-sans relative overflow-x-hidden"
        style={{paddingBottom: kbHeight > 0 ? kbHeight + 72 : 84}}>

        {/* ════ BACKGROUND — Cyber-Jungle atmosphere ════ */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Deep space base */}
          <div className="absolute inset-0 bg-[#04040f]" />
          {/* Layered gradient atmosphere — mimics the illustration */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d0820]/90 via-[#04040f]/95 to-[#050d14]/90" />
          {/* Large violet nebula — top left (like the glowing canopy) */}
          <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full"
            style={{background:"radial-gradient(circle, rgba(88,28,135,0.18) 0%, rgba(59,7,100,0.08) 50%, transparent 70%)", filter:"blur(60px)"}} />
          {/* Cyan mist — bottom center (like the valley fog) */}
          <div className="absolute bottom-0 left-[10%] w-[80%] h-[300px] rounded-full"
            style={{background:"radial-gradient(ellipse, rgba(6,182,212,0.07) 0%, rgba(8,145,178,0.04) 50%, transparent 70%)", filter:"blur(50px)"}} />
          {/* Magenta/pink accent — right side (like the hot pink leaves) */}
          <div className="absolute top-[20%] -right-24 w-[500px] h-[500px] rounded-full"
            style={{background:"radial-gradient(circle, rgba(219,39,119,0.08) 0%, rgba(168,0,80,0.04) 50%, transparent 70%)", filter:"blur(70px)"}} />
          {/* Emerald ground glow — bottom right */}
          <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[300px] rounded-full"
            style={{background:"radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 65%)", filter:"blur(60px)"}} />
          {/* Orange/gold warm spot — mid center (like the golden icons) */}
          <div className="absolute top-[45%] left-[35%] w-[300px] h-[250px] rounded-full"
            style={{background:"radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)", filter:"blur(50px)"}} />
          {/* Subtle scan lines overlay for depth */}
          <div className="absolute inset-0 opacity-[0.012]"
            style={{backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)", backgroundSize:"100% 4px"}} />
          {/* Subtle vignette */}
          <div className="absolute inset-0"
            style={{background:"radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)"}} />
        </div>

        {/* ════ Breath overlay ════ */}
        {breathActive && (
          <div className="fixed inset-0 z-[200] bg-[#04040f]/96 backdrop-blur-3xl flex flex-col items-center justify-center"
            onClick={()=>{if(breathCount>=3){setBreathActive(false);setBreathCount(0);}}}>
            <div className={`w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${
              breathPhase==="in"?"scale-[1.5] border-cyan-400/30 shadow-[0_0_80px_rgba(6,182,212,0.12)]":
              breathPhase==="hold"?"scale-[1.5] border-violet-400/30 shadow-[0_0_80px_rgba(139,92,246,0.12)]":
              "scale-100 border-white/10"}`}>
              <span className="text-sm text-gray-500">{breathPhase==="in"?"Вдох":breathPhase==="hold"?"Пауза":"Выдох"}</span>
            </div>
            <p className="mt-8 text-xs text-gray-700">{breathCount}/5 · 4–2–6</p>
            {breathCount>=3 && <p className="mt-3 text-[11px] text-gray-600 p2">Нажми чтобы завершить</p>}
          </div>
        )}

        {/* ════ App shell ════ */}
        <div className="relative z-10 mx-auto max-w-[540px] lg:max-w-[960px]">

          {/* ── Header ── */}
          <header className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{dayData.sprintIcon}</span>
              <div>
                <p className="text-[10px] tracking-[0.15em] text-gray-700 uppercase">X100 Oasis</p>
                <p className="text-[13px] font-semibold text-white/90 leading-tight">День {currentDay} · {dayData.sprint}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleRadio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border transition-all backdrop-blur-sm ${radioOn
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                  : "border-white/[0.07] bg-white/[0.02] text-gray-600 hover:text-gray-300"}`}>
                <span>{radioOn?"⏸":"▶"}</span>
                <span className="hidden sm:inline">{RADIO[radioIdx].name}</span>
                {radioOn && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 p2" />}
              </button>
              {radioOn && (
                <button onClick={nextStation} className="text-[11px] text-gray-600 hover:text-gray-300 px-1 transition-colors">⟳</button>
              )}
              <button onClick={()=>setShowPicker(!showPicker)}
                className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] text-gray-500 hover:text-white hover:border-white/15 transition-all backdrop-blur-sm">
                {currentDay}
              </button>
            </div>
          </header>

          {/* ── Day picker ── */}
          {showPicker && (
            <div className="mx-5 mb-4 p-4 rounded-2xl bg-[#09091a]/80 border border-white/[0.08] backdrop-blur-2xl fu">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Выбери день</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({length:100},(_,i)=>i+1).map(d=>(
                  <button key={d} onClick={()=>{setCurrentDay(d);setShowPicker(false);}}
                    className={`h-7 rounded-lg text-[10px] transition-all ${
                      d===currentDay?"bg-violet-500/20 text-violet-200 font-bold border border-violet-500/20":
                      completed.includes(d)?"bg-emerald-500/10 text-emerald-400/50":"text-gray-700 hover:text-gray-300 hover:bg-white/[0.04]"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-[9px] text-gray-700">
                <span><span className="inline-block w-2 h-2 mr-1 rounded bg-emerald-500/30 align-middle"/>пройден</span>
                <span><span className="inline-block w-2 h-2 mr-1 rounded bg-violet-500/20 align-middle"/>текущий</span>
                <span className="ml-auto">{completed.length}/100 · {pct}%</span>
              </div>
            </div>
          )}

          {/* ── Main content grid ── */}
          <main className="px-5 pb-4 grid gap-4 lg:grid-cols-2 lg:items-start">

            {/* LEFT */}
            <div className="space-y-4">

              {/* Theme */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-5 backdrop-blur-sm fu">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{dayData.sprintIcon}</span>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">{dayData.sprint}</p>
                    <h2 className="text-[15px] font-semibold text-white/90">{dayData.title}</h2>
                  </div>
                </div>
                <p className="text-[13px] text-gray-400 leading-[1.75] mb-4">{dayData.desc}</p>
                <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] px-4 py-3 text-center">
                  <p className="text-[12px] text-white/40 italic">「 {dayData.mantra} 」</p>
                </div>
              </div>

              {/* Practices */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-5 backdrop-blur-sm fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Практики</p>
                <div className="space-y-2">
                  {dayData.practices.map((p,i)=>(
                    <button key={i}
                      onClick={()=>{if(p.icon==="🫁"){setBreathActive(true);setBreathCount(0);}}}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-all text-left group">
                      <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">{p.icon}</span>
                      <div className="flex-1">
                        <p className="text-[12px] text-gray-300">{p.name}</p>
                        <p className="text-[10px] text-gray-600">{p.duration}</p>
                      </div>
                      {p.icon==="🫁" && <span className="text-[9px] text-gray-700 group-hover:text-cyan-400 transition-colors">→ запустить</span>}
                    </button>
                  ))}
                </div>
                {!completed.includes(currentDay) ? (
                  <button onClick={completeDay}
                    className="mt-4 w-full py-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-emerald-400/70 text-[12px] hover:bg-emerald-500/10 transition-all">
                    ✓ День завершён
                  </button>
                ) : (
                  <p className="mt-4 text-center text-[11px] text-emerald-400/40 py-2">✓ Выполнено</p>
                )}
              </div>

              {/* Journal */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-5 backdrop-blur-sm fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">Дневник</p>
                {!journalSaved ? (
                  <>
                    <textarea value={journal} onChange={e=>setJournal(e.target.value)}
                      className="w-full bg-transparent resize-none text-[13px] text-gray-300 focus:outline-none placeholder:text-gray-700 leading-relaxed"
                      rows={4} placeholder="Что заметил сегодня?" />
                    {journal.trim() && (
                      <button onClick={()=>{setJournalSaved(true);try{const j=JSON.parse(localStorage.getItem("x100v4_journal")||"{}");j[currentDay]=journal;localStorage.setItem("x100v4_journal",JSON.stringify(j));}catch{}}}
                        className="mt-2 w-full py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-gray-500 text-[11px] hover:bg-white/[0.04] transition-all">
                        Сохранить
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-gray-600 italic">✓ Запись сохранена</p>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-4">

              {/* Articles */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-5 backdrop-blur-sm fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">📚 Читать</p>
                <div className="space-y-2">
                  {dayData.articles.map((a,i)=>(
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-all group">
                      <span className="text-base opacity-40 group-hover:opacity-80 transition-opacity shrink-0">{a.emoji}</span>
                      <span className="text-[12px] text-gray-500 group-hover:text-gray-200 transition-colors flex-1 leading-snug">{a.title}</span>
                      <span className="text-[10px] text-gray-700 group-hover:text-cyan-400 transition-colors shrink-0">↗</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Sprint map */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4 backdrop-blur-sm fu">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest">{dayData.sprint}</p>
                  <p className="text-[10px] text-gray-700">{completed.filter(d=>d>=sprintStart&&d<sprintStart+10).length}/10</p>
                </div>
                <div className="flex gap-1.5">
                  {sprintDays.map(d=>(
                    <button key={d} onClick={()=>setCurrentDay(d)}
                      className={`flex-1 h-8 rounded-lg text-[10px] transition-all ${
                        d===currentDay?"bg-violet-500/20 text-violet-200 border border-violet-500/20":
                        completed.includes(d)?"bg-emerald-500/8 text-emerald-400/50":"bg-white/[0.015] text-gray-700 hover:bg-white/[0.04]"}`}>
                      {((d-1)%10)+1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] p-5 backdrop-blur-sm fu">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">🔗 Ресурсы</p>
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
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/10 hover:bg-white/[0.03] transition-all group">
                      <span className="text-sm opacity-40 group-hover:opacity-80">{l.icon}</span>
                      <span className="text-[11px] text-gray-600 group-hover:text-gray-200 transition-colors">{l.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] px-4 py-3 backdrop-blur-sm fu">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-600">Прогресс</p>
                  <p className="text-[10px] text-gray-600">{completed.length}/100 · {pct}%</p>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${pct}%`, background:"linear-gradient(90deg, rgba(139,92,246,0.6), rgba(6,182,212,0.5))"}} />
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* ════ Agent X100 chat bar — fixed, keyboard-aware ════ */}
        <div className="fixed left-0 right-0 z-50" style={{bottom: kbHeight}}>
          <div className="mx-auto max-w-[540px] lg:max-w-[960px] px-3 pb-3">

            {/* Messages */}
            {chatOpen && messages.length > 0 && (
              <div className="mb-1 max-h-[200px] overflow-y-auto rounded-t-2xl bg-[#07071a]/90 backdrop-blur-2xl border border-b-0 border-white/[0.08] px-4 py-3">
                <div className="space-y-2.5">
                  {messages.map((m,i)=>(
                    <div key={i} className={`flex fu ${m.role==="user"?"justify-end":"justify-start"}`}>
                      <div className={`max-w-[85%] px-3.5 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-line ${
                        m.role==="agent"
                          ?"bg-white/[0.03] border border-white/[0.05] text-gray-400"
                          :"bg-violet-600/15 border border-violet-500/15 text-violet-200"}`}>
                        {m.role==="agent" && <span className="text-violet-400/60 text-[9px] font-bold tracking-wider mr-1.5">AGENT·</span>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {agentTyping && (
                    <div className="flex justify-start fu">
                      <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <span className="inline-flex gap-1 text-gray-600">
                          <span className="p2" style={{animationDelay:"0ms"}}>•</span>
                          <span className="p2" style={{animationDelay:"200ms"}}>•</span>
                          <span className="p2" style={{animationDelay:"400ms"}}>•</span>
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex items-center gap-2 bg-[#07071a]/90 backdrop-blur-2xl border border-white/[0.09] rounded-2xl px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
              <button onClick={()=>setChatOpen(!chatOpen)}
                className="text-violet-400/50 text-[10px] font-bold tracking-wider shrink-0 hover:text-violet-400 transition-colors">
                {chatOpen?"▾":"▸"} AGENT
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck={false}
                className="flex-1 bg-transparent text-[13px] text-gray-300 focus:outline-none placeholder:text-gray-700 min-w-0"
                placeholder="Напиши запрос — дам план или совет..."
              />
              {input.trim() && (
                <button onPointerDown={e=>{e.preventDefault();send();}}
                  className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/20 flex items-center justify-center text-violet-300 text-xs hover:bg-violet-500/35 transition-all shrink-0">
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
