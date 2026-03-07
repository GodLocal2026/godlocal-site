# Prompt Object Pattern — CodeThinker

Рабочая реализация паттерна «Prompt as Code» от GodLocal.

## Что делает

1. **`Prompt`** — интерфейс с `id`, `text`, `variables`
2. **`PromptObject`** — набор промптов + шаблон + `rendered` (итоговый текст)
3. **`PromptService.renderPrompt(template, variables)`** — интерполирует `{{переменная}}` → значение
4. **`/api/prompt`** — Next.js route, отправляет `rendered` в OpenAI GPT-4o-mini
5. **`page.tsx`** — UI: редактируй шаблон, переменные → генерируй → отправляй в AI

## Пример

```ts
const service = new PromptService();
service.addPrompt({
  id: '1',
  text: 'помоги мне сосредоточиться',
  variables: { topic: 'продуктивностью', style: 'кратко', userText: 'помоги мне сосредоточиться' },
});

const obj = service.generatePromptObject(
  'Ты помогаешь с {{topic}}. Стиль: {{style}}. Пользователь: {{userText}}'
);
// obj.rendered = "Ты помогаешь с продуктивностью. Стиль: кратко. Пользователь: помоги мне сосредоточиться"

// Отправляем в AI:
const res = await fetch('/api/prompt', {
  method: 'POST',
  body: JSON.stringify({ rendered: obj.rendered }),
});
const { result } = await res.json();
console.log(result); // ← ответ GPT
```

## Env

```
OPENAI_API_KEY=sk-...
```

## Стек
- Next.js 14+ / App Router
- TypeScript strict
- React 18
