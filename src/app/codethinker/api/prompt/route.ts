import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/prompt
 * Body: { rendered: string }
 * Отправляет рендеренный промпт в OpenAI и возвращает ответ.
 */
export async function POST(req: NextRequest) {
  try {
    const { rendered } = await req.json();

    if (!rendered || typeof rendered !== 'string') {
      return NextResponse.json({ error: 'rendered prompt required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: rendered }],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ result: text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
