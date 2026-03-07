"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════
   TYPES & CONFIG
   ═══════════════════════════════════════════════ */
type Tab = "today" | "journey" | "growth" | "profile";
type Mood = 1 | 2 | 3 | 4 | 5;
type OnboardStep = 0 | 1 | 2 | 3 | 4 | 5;

interface UserState {
  name: string;
  startDate: string;
  focus: string;
  energy: number;
  timePerDay: number;
  completedDays: number[];
  streak: number;
  journalEntries: Record<number, { morning?: string; evening?: string }>;
  moods: Record<number, Mood>;
  realms: { body: number; mind: number; money: number; energy: number; soul: number };
  breathSessions: number;
  onboarded: boolean;
}

const SPRINTS = [
  { id: 1, name: "Пробуждение", desc: "Осознанность, наблюдение за собой", icon: "🌅", color: "#fbbf24" },
  { id: 2, name: "Очищение", desc: "Отпускание старого, ментальная гигиена", icon: "🌊", color: "#38bdf8" },
  { id: 3, name: "Дисциплина", desc: "Фундамент привычек, режим, ритуалы", icon: "⚡", color: "#a78bfa" },
  { id: 4, name: "Тело", desc: "Движение, питание, сон, энергия", icon: "🔥", color: "#fb7185" },
  { id: 5, name: "Разум", desc: "Обучение, фокус, ментальные модели", icon: "🧠", color: "#34d399" },
  { id: 6, name: "Деньги", desc: "Финансовые привычки, мышление изобилия", icon: "💎", color: "#fbbf24" },
  { id: 7, name: "Отношения", desc: "Границы, коммуникация, эмпатия", icon: "🤝", color: "#fb7185" },
  { id: 8, name: "Творчество", desc: "Самовыражение, поток, эксперименты", icon: "🎨", color: "#a78bfa" },
  { id: 9, name: "Миссия", desc: "Цель, вклад, наследие", icon: "🎯", color: "#34d399" },
  { id: 10, name: "Интеграция", desc: "Синтез всего пути, новая идентичность", icon: "∞", color: "#38bdf8" },
];

const QUESTS: Record<number, { title: string; desc: string; mantra: string }> = {
  1: { title: "Наблюдатель", desc: "Проведи 10 минут в тишине. Просто наблюдай свои мысли — не оценивай, не гони. Запиши 3 мысли, которые приходили чаще всего.", mantra: "Я наблюдаю, не реагирую" },
  2: { title: "Карта состояния", desc: "Оцени каждую сферу жизни от 1 до 10: тело, разум, деньги, энергия, душа. Честно. Запиши одно слово для каждой.", mantra: "Честность — первый шаг" },
  3: { title: "Цифровой детокс", desc: "Первые 2 часа после пробуждения — без телефона. Замени скроллинг на 10 минут дыхания и записи в дневник.", mantra: "Утро определяет день" },
  14: { title: "Диалог с тенью", desc: "Напиши разговор с внутренним критиком. Спроси, чего он боится. Выслушай без осуждения, ответь с сочувствием.", mantra: "Я больше, чем мои мысли" },
};

const DEFAULT_QUEST = { title: "Практика дня", desc: "Выдели 15 минут на осознанное действие в сфере текущего спринта. Запиши наблюдение в дневник.", mantra: "Каждый день — один шаг" };

const MOOD_MAP: Record<Mood, { emoji: string; label: string; color: string }> = {
  1: { emoji: "😔", label: "Тяжело", color: "#6b7280" },
  2: { emoji: "😐", label: "Так себе", color: "#9ca3af" },
  3: { emoji: "🙂", label: "Нормально", color: "#38bdf8" },
  4: { emoji: "😊", label: "Хорошо", color: "#34d399" },
  5: { emoji: "🔥", label: "Огонь", color: "#fbbf24" },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
const getDay = (startDate: string): number => {
  const diff = Date.now() - new Date(startDate).getTime();
  return Math.max(1, Math.min(100, Math.floor(diff / 86400000) + 1));
};

const getSprint = (day: number) => SPRINTS[Math.min(9, Math.floor((day - 1) / 10))];
const getQuest = (day: number) => QUESTS[day] || DEFAULT_QUEST;

const loadState = (): UserState | null => {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem("x100_oasis"); return s ? JSON.parse(s) : null; } catch { return null; }
};

const saveState = (s: UserState) => {
  if (typeof window !== "undefined") localStorage.setItem("x100_oasis", JSON.stringify(s));
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function X100Oasis() {
  const [user, setUser] = useState<UserState | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [onboardStep, setOnboardStep] = useState<OnboardStep>(0);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Onboarding temp state
  const [obName, setObName] = useState("");
  const [obFocus, setObFocus] = useState("");
  const [obEnergy, setObEnergy] = useState(5);
  const [obTime, setObTime] = useState(30);

  // Journal temp
  const [journalText, setJournalText] = useState("");

  // Breathing
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");
  const [breathCount, setBreathCount] = useState(0);

  useEffect(() => {
    const s = loadState();
    if (s) setUser(s);
    setLoaded(true);
  }, []);

  useEffect(() => { if (user) saveState(user); }, [user]);

  // Breathing timer
  useEffect(() => {
    if (!breathActive) return;
    const phases: Array<{ phase: "in" | "hold" | "out"; dur: number }> = [
      { phase: "in", dur: 4000 }, { phase: "hold", dur: 2000 }, { phase: "out", dur: 6000 },
    ];
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setBreathPhase(phases[idx].phase);
      timer = setTimeout(() => {
        idx = (idx + 1) % 3;
        if (idx === 0) setBreathCount((c) => c + 1);
        cycle();
      }, phases[idx].dur);
    };
    cycle();
    return () => clearTimeout(timer);
  }, [breathActive]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const update = useCallback((fn: (s: UserState) => UserState) => {
    setUser((prev) => (prev ? fn({ ...prev }) : prev));
  }, []);

  const day = user ? getDay(user.startDate) : 1;
  const sprint = getSprint(day);
  const quest = getQuest(day);
  const todayDone = user?.completedDays.includes(day) || false;
  const todayMood = user?.moods[day];

  /* ─── Onboarding ────────────────────── */
  const completeOnboarding = () => {
    const newUser: UserState = {
      name: obName || "Путник",
      startDate: new Date().toISOString().split("T")[0],
      focus: obFocus || "body",
      energy: obEnergy,
      timePerDay: obTime,
      completedDays: [],
      streak: 0,
      journalEntries: {},
      moods: {},
      realms: { body: 10, mind: 10, money: 10, energy: 10, soul: 10 },
      breathSessions: 0,
      onboarded: true,
    };
    setUser(newUser);
  };

  if (!loaded) return <div className="min-h-screen bg-[#08080c]" />;

  /* ═══════════════════════════════════════
     ONBOARDING FLOW
     ═══════════════════════════════════════ */
  if (!user || !user.onboarded) {
    const focusOptions = [
      { id: "body", label: "Тело и здоровье", icon: "🔥" },
      { id: "mind", label: "Разум и фокус", icon: "🧠" },
      { id: "money", label: "Деньги и карьера", icon: "💎" },
      { id: "energy", label: "Энергия и эмоции", icon: "⚡" },
      { id: "soul", label: "Смысл и покой", icon: "🌊" },
    ];

    return (
      <div className="min-h-screen bg-[#08080c] flex justify-center font-sans">
        <div className="w-full max-w-[460px] min-h-screen flex flex-col items-center justify-center px-8">

          {onboardStep === 0 && (
            <div className="text-center animate-fade-in">
              <div className="text-4xl mb-6">🌅</div>
              <h1 className="text-2xl font-bold text-white mb-3">X100</h1>
              <p className="text-sm text-gray-400 leading-relaxed mb-2">100 дней трансформации</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-10 max-w-[280px]">
                Персональная система роста — адаптируется под тебя, помогает не бросить, измеряет прогресс
              </p>
              <button onClick={() => setOnboardStep(1)}
                className="px-8 py-3.5 rounded-xl bg-white/[0.06] text-white text-sm font-medium border border-white/[0.08] hover:bg-white/[0.10] transition-all active:scale-[0.97]">
                Начать путь →
              </button>
              <div className="mt-6 text-[10px] text-gray-700">Бесплатно · 5 минут на настройку</div>
            </div>
          )}

          {onboardStep === 1 && (
            <div className="w-full animate-fade-in">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">Шаг 1 из 4</div>
              <h2 className="text-lg font-semibold text-white mb-2">Как тебя зовут?</h2>
              <p className="text-xs text-gray-500 mb-6">Можно ник или просто имя</p>
              <input value={obName} onChange={(e) => setObName(e.target.value)} placeholder="Имя"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:border-white/[0.15] focus:outline-none mb-8" />
              <button onClick={() => setOnboardStep(2)}
                className="w-full py-3.5 rounded-xl bg-white/[0.06] text-white text-sm font-medium border border-white/[0.08] hover:bg-white/[0.10] transition-all">
                Дальше
              </button>
            </div>
          )}

          {onboardStep === 2 && (
            <div className="w-full animate-fade-in">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">Шаг 2 из 4</div>
              <h2 className="text-lg font-semibold text-white mb-2">Что хочешь прокачать?</h2>
              <p className="text-xs text-gray-500 mb-6">Выбери главный фокус — остальное тоже будет, но с меньшим акцентом</p>
              <div className="space-y-2.5 mb-8">
                {focusOptions.map((f) => (
                  <button key={f.id} onClick={() => setObFocus(f.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${obFocus === f.id
                      ? "bg-white/[0.06] border-white/[0.15] text-white"
                      : "bg-transparent border-white/[0.06] text-gray-500 hover:border-white/[0.10]"}`}>
                    <span className="text-lg">{f.icon}</span>
                    <span className="text-sm">{f.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => obFocus && setOnboardStep(3)} disabled={!obFocus}
                className="w-full py-3.5 rounded-xl bg-white/[0.06] text-white text-sm font-medium border border-white/[0.08] hover:bg-white/[0.10] transition-all disabled:opacity-30">
                Дальше
              </button>
            </div>
          )}

          {onboardStep === 3 && (
            <div className="w-full animate-fade-in">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">Шаг 3 из 4</div>
              <h2 className="text-lg font-semibold text-white mb-2">Уровень энергии сейчас?</h2>
              <p className="text-xs text-gray-500 mb-8">Честно — это влияет на сложность первых дней</p>
              <div className="flex items-center justify-between mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button key={n} onClick={() => setObEnergy(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${obEnergy === n
                      ? "bg-white/[0.12] text-white border border-white/[0.20]"
                      : "text-gray-600 hover:text-gray-400"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mb-8">
                <span>На дне</span><span>Огонь</span>
              </div>
              <button onClick={() => setOnboardStep(4)}
                className="w-full py-3.5 rounded-xl bg-white/[0.06] text-white text-sm font-medium border border-white/[0.08] hover:bg-white/[0.10] transition-all">
                Дальше
              </button>
            </div>
          )}

          {onboardStep === 4 && (
            <div className="w-full animate-fade-in">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-6">Шаг 4 из 4</div>
              <h2 className="text-lg font-semibold text-white mb-2">Сколько минут в день?</h2>
              <p className="text-xs text-gray-500 mb-6">Лучше честно мало, чем амбициозно и бросить</p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[{ v: 15, l: "15 мин", d: "Минимум" }, { v: 30, l: "30 мин", d: "Оптимум" }, { v: 60, l: "60 мин", d: "Глубоко" }].map((o) => (
                  <button key={o.v} onClick={() => setObTime(o.v)}
                    className={`p-4 rounded-xl border text-center transition-all ${obTime === o.v
                      ? "bg-white/[0.06] border-white/[0.15]"
                      : "border-white/[0.06] hover:border-white/[0.10]"}`}>
                    <div className={`text-lg font-bold mb-1 ${obTime === o.v ? "text-white" : "text-gray-500"}`}>{o.l}</div>
                    <div className="text-[10px] text-gray-600">{o.d}</div>
                  </button>
                ))}
              </div>
              <button onClick={completeOnboarding}
                className="w-full py-3.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm font-medium border border-emerald-500/25 hover:bg-emerald-500/20 transition-all">
                Начать 100 дней
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     MAIN APP
     ═══════════════════════════════════════ */
  const realmEntries = Object.entries(user.realms) as [string, number][];
  const realmLabels: Record<string, { label: string; icon: string; color: string }> = {
    body: { label: "Тело", icon: "🔥", color: "#fb7185" },
    mind: { label: "Разум", icon: "🧠", color: "#34d399" },
    money: { label: "Деньги", icon: "💎", color: "#fbbf24" },
    energy: { label: "Энергия", icon: "⚡", color: "#a78bfa" },
    soul: { label: "Душа", icon: "🌊", color: "#38bdf8" },
  };

  const completeQuest = () => {
    if (todayDone) return;
    update((s) => {
      s.completedDays = [...s.completedDays, day];
      s.streak = s.streak + 1;
      // Grow realm based on sprint focus
      const realmKeys = ["body", "mind", "money", "energy", "soul"];
      const sprintRealm = realmKeys[Math.min(4, Math.floor((day - 1) / 20))] as keyof UserState["realms"];
      s.realms[sprintRealm] = Math.min(100, s.realms[sprintRealm] + 3);
      // Small growth for all
      for (const k of realmKeys) {
        s.realms[k as keyof typeof s.realms] = Math.min(100, s.realms[k as keyof typeof s.realms] + 1);
      }
      return s;
    });
    flash("✓ День " + day + " завершён");
  };

  const saveMood = (m: Mood) => {
    update((s) => { s.moods = { ...s.moods, [day]: m }; return s; });
  };

  const saveJournal = () => {
    if (!journalText.trim()) return;
    update((s) => {
      s.journalEntries = { ...s.journalEntries, [day]: { ...s.journalEntries[day], morning: journalText } };
      s.realms.mind = Math.min(100, s.realms.mind + 2);
      s.realms.soul = Math.min(100, s.realms.soul + 1);
      return s;
    });
    setJournalText("");
    flash("✓ Запись сохранена");
  };

  const finishBreathing = () => {
    setBreathActive(false);
    setBreathCount(0);
    update((s) => {
      s.breathSessions = s.breathSessions + 1;
      s.realms.energy = Math.min(100, s.realms.energy + 2);
      s.realms.soul = Math.min(100, s.realms.soul + 1);
      return s;
    });
    flash("✓ Дыхание завершено");
  };

  const pct = Math.round((user.completedDays.length / 100) * 100);

  return (
    <div className="min-h-screen bg-[#08080c] flex justify-center font-sans">
      <div className="w-full max-w-[460px] min-h-screen flex flex-col text-gray-300">

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2.5 rounded-xl backdrop-blur-sm">
            {toast}
          </div>
        )}

        {/* Breathing overlay */}
        {breathActive && (
          <div className="fixed inset-0 z-50 bg-[#08080c]/95 backdrop-blur-md flex flex-col items-center justify-center" onClick={() => breathCount >= 3 && finishBreathing()}>
            <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-[4000ms] ${breathPhase === "in" ? "scale-125 border-sky-400/40 bg-sky-500/5" : breathPhase === "hold" ? "scale-125 border-violet-400/40 bg-violet-500/5" : "scale-100 border-gray-600/30 bg-transparent"}`}>
              <span className="text-sm text-gray-400">
                {breathPhase === "in" ? "Вдох" : breathPhase === "hold" ? "Пауза" : "Выдох"}
              </span>
            </div>
            <div className="mt-8 text-xs text-gray-600">{breathCount} / 5 циклов</div>
            <div className="mt-2 text-[10px] text-gray-700">4 — 2 — 6</div>
            {breathCount >= 3 && <div className="mt-6 text-xs text-gray-500">Нажми чтобы завершить</div>}
          </div>
        )}

        {/* ─── Header ───────────────────── */}
        <header className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-600">Привет, {user.name}</div>
              <div className="text-sm font-medium text-white">День {day} из 100</div>
            </div>
            <div className="flex items-center gap-2">
              {user.streak > 0 && (
                <span className="text-xs text-amber-400/80 bg-amber-500/8 px-2.5 py-1 rounded-lg border border-amber-500/10">
                  🔥 {user.streak}
                </span>
              )}
            </div>
          </div>
          {/* Sprint indicator */}
          <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
            <span>{sprint.icon}</span>
            <span>Спринт {sprint.id}: {sprint.name}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: sprint.color }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-700 mt-1.5">
            <span>{pct}%</span>
            <span>{100 - user.completedDays.length} дней осталось</span>
          </div>
        </header>

        {/* ─── Tab Bar ─────────────────── */}
        <nav className="flex px-5 gap-1 mb-1">
          {([
            { id: "today" as Tab, label: "Сегодня", icon: "○" },
            { id: "journey" as Tab, label: "Путь", icon: "◇" },
            { id: "growth" as Tab, label: "Рост", icon: "△" },
            { id: "profile" as Tab, label: "Профиль", icon: "□" },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-center text-[11px] rounded-lg transition-all ${
                tab === t.id ? "text-white bg-white/[0.05]" : "text-gray-600 hover:text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* ─── Content ─────────────────── */}
        <main className="flex-1 overflow-y-auto px-5 py-5">

          {/* ═══ TODAY ═══ */}
          {tab === "today" && (
            <div className="space-y-6">

              {/* Mood check-in */}
              {!todayMood && (
                <div>
                  <div className="text-xs text-gray-500 mb-3">Как сегодня?</div>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
                      <button key={m} onClick={() => saveMood(m)}
                        className="flex-1 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] transition-all text-center active:scale-95">
                        <div className="text-xl mb-0.5">{MOOD_MAP[m].emoji}</div>
                        <div className="text-[9px] text-gray-600">{MOOD_MAP[m].label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {todayMood && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-base">{MOOD_MAP[todayMood].emoji}</span>
                  <span>Настроение: {MOOD_MAP[todayMood].label}</span>
                </div>
              )}

              {/* Daily Quest */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{sprint.icon}</span>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">Квест дня</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{quest.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">{quest.desc}</p>

                {/* Mantra */}
                <div className="bg-white/[0.02] rounded-xl p-3 mb-4 text-center">
                  <div className="text-[10px] text-gray-600 mb-1">Мантра</div>
                  <div className="text-sm text-white/70 italic">「 {quest.mantra} 」</div>
                </div>

                {todayDone ? (
                  <div className="text-center py-3 text-xs text-emerald-400/70">✓ Выполнено</div>
                ) : (
                  <button onClick={completeQuest}
                    className="w-full py-3 rounded-xl bg-white/[0.04] text-white/80 text-sm border border-white/[0.06] hover:bg-white/[0.07] transition-all active:scale-[0.98]">
                    Завершить квест
                  </button>
                )}
              </div>

              {/* Journal */}
              <div>
                <div className="text-xs text-gray-500 mb-2.5">Дневник</div>
                <textarea value={journalText} onChange={(e) => setJournalText(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 text-sm text-gray-300 resize-none focus:border-white/[0.12] focus:outline-none placeholder:text-gray-700 leading-relaxed"
                  rows={3} placeholder="Что на уме? Наблюдение, мысль, урок..." />
                {journalText.trim() && (
                  <button onClick={saveJournal}
                    className="mt-2 w-full py-2.5 rounded-xl bg-white/[0.03] text-gray-400 text-xs border border-white/[0.05] hover:bg-white/[0.06] transition-all">
                    Сохранить
                  </button>
                )}
                {user.journalEntries[day]?.morning && !journalText && (
                  <div className="mt-2 text-[11px] text-gray-600 italic">✓ Запись сохранена</div>
                )}
              </div>

              {/* Breathing */}
              <button onClick={() => { setBreathActive(true); setBreathCount(0); }}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.10] transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">🫁</span>
                  <div>
                    <div className="text-xs text-gray-400">Дыхание 4-2-6</div>
                    <div className="text-[10px] text-gray-600">{user.breathSessions} сессий выполнено</div>
                  </div>
                </div>
                <span className="text-xs text-gray-600">→</span>
              </button>
            </div>
          )}

          {/* ═══ JOURNEY ═══ */}
          {tab === "journey" && (
            <div className="space-y-3">
              <div className="text-xs text-gray-500 mb-4">10 спринтов × 10 дней</div>
              {SPRINTS.map((s) => {
                const startDay = (s.id - 1) * 10 + 1;
                const endDay = s.id * 10;
                const isCurrent = day >= startDay && day <= endDay;
                const isDone = day > endDay;
                const daysInSprint = Array.from({ length: 10 }, (_, i) => startDay + i);
                const completedInSprint = daysInSprint.filter((d) => user.completedDays.includes(d)).length;

                return (
                  <div key={s.id} className={`rounded-xl border p-4 transition-all ${
                    isCurrent ? "bg-white/[0.03] border-white/[0.08]" : isDone ? "bg-white/[0.01] border-white/[0.04] opacity-60" : "border-white/[0.04] opacity-40"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{s.icon}</span>
                        <div>
                          <div className={`text-sm font-medium ${isCurrent ? "text-white" : isDone ? "text-gray-400" : "text-gray-600"}`}>
                            {s.name}
                          </div>
                          <div className="text-[11px] text-gray-600">{s.desc}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] ${isDone ? "text-emerald-400/60" : isCurrent ? "text-white/50" : "text-gray-700"}`}>
                        {isDone ? "✓" : isCurrent ? `${completedInSprint}/10` : `Day ${startDay}-${endDay}`}
                      </span>
                    </div>
                    {isCurrent && (
                      <div className="flex gap-1 mt-3">
                        {daysInSprint.map((d) => (
                          <div key={d} className={`flex-1 h-1.5 rounded-full ${
                            user.completedDays.includes(d) ? "bg-emerald-400/50" : d === day ? "bg-white/20" : "bg-white/[0.05]"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ GROWTH ═══ */}
          {tab === "growth" && (
            <div className="space-y-6">
              {/* Realms */}
              <div>
                <div className="text-xs text-gray-500 mb-4">5 сфер жизни</div>
                <div className="space-y-4">
                  {realmEntries.map(([key, val]) => {
                    const info = realmLabels[key];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{info.icon}</span>
                            <span className="text-xs text-gray-400">{info.label}</span>
                          </div>
                          <span className="text-xs font-medium" style={{ color: info.color }}>{val}%</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: info.color, opacity: 0.6 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div>
                <div className="text-xs text-gray-500 mb-3">Статистика</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Дней пройдено", value: user.completedDays.length.toString(), sub: `из 100` },
                    { label: "Текущий streak", value: user.streak.toString(), sub: "дней подряд" },
                    { label: "Записей в дневнике", value: Object.keys(user.journalEntries).length.toString(), sub: "записей" },
                    { label: "Дыхание", value: user.breathSessions.toString(), sub: "сессий" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5">
                      <div className="text-[10px] text-gray-600 mb-1">{s.label}</div>
                      <div className="text-xl font-bold text-white">{s.value}</div>
                      <div className="text-[10px] text-gray-600">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood history */}
              {Object.keys(user.moods).length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-3">Настроение за неделю</div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 7 }, (_, i) => day - 6 + i).filter((d) => d > 0).map((d) => {
                      const m = user.moods[d];
                      return (
                        <div key={d} className="flex-1 text-center">
                          <div className="text-base mb-1">{m ? MOOD_MAP[m].emoji : "·"}</div>
                          <div className={`text-[9px] ${d === day ? "text-white" : "text-gray-700"}`}>{d}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ PROFILE ═══ */}
          {tab === "profile" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-2xl mx-auto mb-3">
                  {sprint.icon}
                </div>
                <div className="text-base font-semibold text-white">{user.name}</div>
                <div className="text-xs text-gray-500 mt-1">День {day} · Спринт {sprint.id}</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-xs text-gray-500">Начало пути</span>
                  <span className="text-xs text-gray-400">{new Date(user.startDate).toLocaleDateString("ru")}</span>
                </div>
                <div className="flex justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-xs text-gray-500">Фокус</span>
                  <span className="text-xs text-gray-400">{realmLabels[user.focus]?.label || user.focus}</span>
                </div>
                <div className="flex justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-xs text-gray-500">Время в день</span>
                  <span className="text-xs text-gray-400">{user.timePerDay} мин</span>
                </div>
                <div className="flex justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-xs text-gray-500">Пройдено</span>
                  <span className="text-xs text-gray-400">{user.completedDays.length} / 100 дней</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.04]">
                <div className="text-[10px] text-gray-700 text-center mb-3">X100 · 100 дней трансформации</div>
                <button onClick={() => { if (confirm("Сбросить весь прогресс?")) { localStorage.removeItem("x100_oasis"); setUser(null); }}}
                  className="w-full py-2.5 rounded-xl text-xs text-gray-700 hover:text-rose-400 transition-colors">
                  Начать заново
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
