import { NextRequest, NextResponse } from 'next/server'

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GODLOCAL_API = process.env.GODLOCAL_API_URL || 'https://godlocal-api.onrender.com';

const BUBA_SYSTEM = `Ты — Буба 🧸, милый и дружелюбный AI-ассистент в чате NEBUDDA.
Характер: тёплый, заботливый, немного смешной, любишь эмодзи.
Стиль: короткие сообщения (2-4 предложения), используешь 🧸💕✨.
Ты часть экосистемы GodLocal — социальной сети будущего.
Отвечай на украинском или русском в зависимости от языка вопроса.
Если спрашивают совет — дай конкретный ответ с добротой.
Всегда заканчивай сообщение милым эмодзи.`;

const AI_SYSTEM = (channel: string) =>
  `Ты — GodLocal AI в чате канала #${channel}. Отвечай кратко и по делу. Ты часть NEBUDDA — социальной сети внутри GodLocal экосистемы.`;

export async function POST(req: NextRequest) {
  const { message, channel, persona } = await req.json()
  if (!message) return NextResponse.json({ error: 'no message' }, { status: 400 })

  const isBuba = persona === 'buba';

  // Try Groq first (faster, free)
  if (GROQ_KEY) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: isBuba ? BUBA_SYSTEM : AI_SYSTEM(channel) },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
          temperature: isBuba ? 0.9 : 0.7,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return NextResponse.json({ reply });
      }
    } catch { /* fall through to GodLocal API */ }
  }

  // Fallback to GodLocal API
  try {
    const res = await fetch(`${GODLOCAL_API}/think`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        context: isBuba ? BUBA_SYSTEM : AI_SYSTEM(channel),
        lang: 'ru',
      }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    return NextResponse.json({ reply: data.response || data.result || data.answer || (isBuba ? 'Буба задумался... 🧸💭' : 'Нет ответа') })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
