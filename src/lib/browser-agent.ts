export interface BrowserAgentResult {
  response: string;
  model: string;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

export async function browserAgent(
  history: { role: 'user' | 'assistant'; content: string }[],
  soul: string,
  groqKey: string
): Promise<BrowserAgentResult> {
  const system = [
    'You are GodLocal — a sovereign AI assistant running directly in the browser, with no server dependency.',
    'You are fast, direct, and assist with coding, research, crypto, and strategy.',
    ...(soul ? ['\n## SOUL Memory (your persistent context)\n' + soul] : []),
  ].join('\n');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, ...history],
      max_tokens: 2048,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Groq ${res.status}`);
  }

  const data = await res.json();
  return { response: data.choices[0].message.content, model: data.model ?? MODEL };
}
