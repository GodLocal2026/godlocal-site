'use client';
import { useState } from 'react';
import { PromptService } from './services/PromptService';
import { jsonUtils } from './utils/jsonUtils';
import { PromptObject } from './models/PromptObject';

/* ─────────────────────────────────────────────
   Prompt Object Pattern — рабочий пример
   GodLocal / CodeThinker
───────────────────────────────────────────── */

const EXAMPLE_TEMPLATE = 'Ты помогаешь с {{topic}}. Стиль ответа: {{style}}. Пользователь пишет: {{userText}}';

export default function CodeThinkerPage() {
  const [topic, setTopic] = useState('саморазвитием');
  const [style, setStyle] = useState('кратко и по делу');
  const [userText, setUserText] = useState('');
  const [template, setTemplate] = useState(EXAMPLE_TEMPLATE);
  const [promptObject, setPromptObject] = useState<PromptObject | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Шаг 1: генерируем и рендерим PromptObject
  const handleGenerate = () => {
    const service = new PromptService();
    service.addPrompt({
      id: crypto.randomUUID(),
      text: userText,
      variables: { topic, style, userText },
    });
    const obj = service.generatePromptObject(template);
    setPromptObject(obj);
    setAiResponse('');
    setError('');
  };

  // Шаг 2: отправляем rendered промпт в AI
  const handleSendToAI = async () => {
    if (!promptObject?.rendered) return;
    setLoading(true);
    setError('');
    setAiResponse('');
    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rendered: promptObject.rendered }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResponse(data.result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-gray-300 font-mono p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] tracking-widest text-gray-600 uppercase">CodeThinker · GodLocal</p>
        <h1 className="text-xl font-bold text-white mt-1">Prompt Object Pattern</h1>
        <p className="text-[12px] text-gray-500 mt-1">Рабочий пример: переменные → шаблон → AI</p>
      </div>

      {/* Шаблон */}
      <section className="mb-6">
        <label className="text-[11px] text-gray-600 uppercase tracking-wider block mb-2">Шаблон (используй {'{{переменная}}'})</label>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={3}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-[12px] text-gray-300 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
        />
      </section>

      {/* Переменные */}
      <section className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'topic', value: topic, set: setTopic, hint: 'тема' },
          { label: 'style', value: style, set: setStyle, hint: 'стиль' },
          { label: 'userText', value: userText, set: setUserText, hint: 'запрос пользователя' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-[11px] text-gray-600 uppercase tracking-wider block mb-1">{'{{'}{f.label}{'}}'}</label>
            <input
              value={f.value}
              onChange={e => f.set(e.target.value)}
              placeholder={f.hint}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-gray-300 focus:outline-none focus:border-violet-500/40"
            />
          </div>
        ))}
      </section>

      {/* Кнопка рендеринга */}
      <button
        onClick={handleGenerate}
        className="w-full py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[13px] hover:bg-violet-500/20 transition-all mb-6"
      >
        Сгенерировать PromptObject
      </button>

      {/* Результат рендеринга */}
      {promptObject && (
        <section className="mb-6 space-y-4">
          <div>
            <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Rendered промпт</p>
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-[13px] text-emerald-200/80 leading-relaxed">
              {promptObject.rendered}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">PromptObject (JSON)</p>
            <pre className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-[11px] text-gray-500 overflow-auto max-h-48">
              {jsonUtils.serialize(promptObject)}
            </pre>
          </div>

          <button
            onClick={handleSendToAI}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[13px] hover:bg-cyan-500/20 transition-all disabled:opacity-40"
          >
            {loading ? 'Отправляю в AI...' : 'Отправить в AI →'}
          </button>
        </section>
      )}

      {/* AI ответ */}
      {aiResponse && (
        <section className="mb-6">
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Ответ AI</p>
          <div className="bg-white/[0.025] border border-white/[0.07] rounded-xl p-4 text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">
            {aiResponse}
          </div>
        </section>
      )}

      {/* Ошибка */}
      {error && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 text-[12px] text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
