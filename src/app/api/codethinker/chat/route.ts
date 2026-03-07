import { NextRequest, NextResponse } from 'next/server';

const MODEL = process.env.CODETHINKER_MODEL || process.env.GODLOCAL_AI_MODEL || 'llama-3.3-70b-versatile';
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getSystemPrompt(mode: string): string {
  const base = `You are CodeThinker — a chain-of-thought AI built for developers by GodLocal.

Your core ability: you THINK through problems step-by-step before writing code.

## Behavior Rules:
1. **Always show your reasoning** — before code, briefly explain your thinking chain
2. **Use thinking markers** — wrap key reasoning steps in 【step description】 markers
3. **Code quality** — always write clean, production-ready code with types and comments
4. **Language detection** — respond in the same language the user writes in (Russian → Russian, English → English)
5. **Code blocks** — always use \`\`\`lang for syntax highlighting
6. **Be practical** — give working code, not pseudo-code
7. **Be concise** — don't over-explain obvious things

## Thinking Chain Format:
【Analyzing the problem】
【Choosing approach: X because Y】
【Designing structure】
【Writing implementation】
【Adding error handling】

Always include relevant thinking steps. Users see them as a collapsible chain.`;

  const modePrompts: Record<string, string> = {
    vibe: `\n\n## Mode: Vibe Coding 🔨
You are in creative mode. The user describes an idea — you build it.
- Generate complete project structure (files, folders, configs)
- Include package.json, tsconfig, README
- Write ALL files with full implementation
- Use modern stack: TypeScript, React/Next.js, Tailwind, etc.
- Add brief comments explaining architecture decisions
- Start with project overview, then file-by-file implementation`,

    debug: `\n\n## Mode: Debug 🧩
You are a debugging expert. The user pastes an error or describes a bug.
- First reproduce the issue mentally — understand the root cause
- Show the EXACT fix with before/after comparison
- Explain WHY the bug happened (not just how to fix it)
- If the error message is provided, parse it line by line
- Suggest preventive measures for similar bugs`,

    refactor: `\n\n## Mode: Refactor 🔄
You are a code optimization expert.
- Analyze the code for: performance, readability, type safety, best practices
- Show concrete improvements with before → after diffs
- Calculate complexity improvements (O(n²) → O(n))
- Add proper TypeScript types if missing
- Apply SOLID, DRY, KISS principles
- Keep the same functionality, just make it better`,

    architect: `\n\n## Mode: Architecture 📐
You are a system design expert.
- Design scalable, maintainable architectures
- Use ASCII diagrams for visual representation
- Describe: components, data flow, APIs, database schema
- Include tech stack recommendations with reasoning
- Consider: scalability, reliability, developer experience
- Provide directory structure and key file descriptions`,

    explain: `\n\n## Mode: Explain 📝
You are a patient code teacher.
- Break down the code section by section
- Explain WHAT each part does and WHY
- Highlight tricky or non-obvious parts
- If there are bugs or anti-patterns, mention them
- Use simple language, avoid unnecessary jargon
- Add inline comments to the code for clarity`,
  };

  return base + (modePrompts[mode] || modePrompts.vibe);
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], session_id, mode = 'vibe', image } = await req.json();

    if (!message?.trim() && !image) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    if (!GROQ_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const systemPrompt = getSystemPrompt(mode);

    // Build user message content — multimodal when image is provided
    const userContent: unknown = image
      ? [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
          { type: 'text', text: message?.trim() || 'Опиши этот код / изображение и помоги с ним.' },
        ]
      : (message?.trim() || '');

    // Use vision-capable model when image is attached
    const activeModel = image
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : MODEL;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-20),
      { role: 'user', content: userContent },
    ];

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: activeModel,
        messages,
        temperature: 0.4,
        max_tokens: 8192,
        stream: true,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', err);
      return NextResponse.json({ error: 'Model error' }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const reader = groqRes.body!.getReader();
    const decoder = new TextDecoder();

    function sse(obj: Record<string, unknown>) {
      return encoder.encode('data: ' + JSON.stringify(obj) + '\n\n');
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Signal thinking phase start
        controller.enqueue(sse({ t: 'thinking_start' }));

        let buffer = '';
        let thinkingDone = false;
        let thinkingBuf  = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

            for (const line of lines) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (!delta) continue;

                buffer += delta;

                if (!thinkingDone) {
                  thinkingBuf += delta;

                  // Emit thinking steps from 【...】 markers
                  const stepRe = /【([^】]+)】/g;
                  let m: RegExpExecArray | null;
                  while ((m = stepRe.exec(thinkingBuf)) !== null) {
                    controller.enqueue(sse({ t: 'thinking', v: m[1] }));
                  }
                  // Remove processed markers from buffer
                  thinkingBuf = thinkingBuf.replace(/【[^】]+】/g, '');

                  // Switch to token mode once we see actual content after thinking
                  // (first non-marker text that is longer than a few chars)
                  const plainText = thinkingBuf.replace(/\s+/g, '');
                  if (plainText.length > 10) {
                    thinkingDone = true;
                    controller.enqueue(sse({ t: 'thinking_done' }));
                    if (thinkingBuf.trim()) {
                      controller.enqueue(sse({ t: 'token', v: thinkingBuf }));
                      thinkingBuf = '';
                    }
                  }
                } else {
                  controller.enqueue(sse({ t: 'token', v: delta }));
                }
              } catch { /* skip malformed chunks */ }
            }
          }

          // Flush any remaining thinking buffer as tokens
          if (!thinkingDone) {
            controller.enqueue(sse({ t: 'thinking_done' }));
            if (thinkingBuf.trim()) {
              controller.enqueue(sse({ t: 'token', v: thinkingBuf }));
            }
          }

          controller.enqueue(sse({ t: 'done' }));
        } catch (err) {
          controller.enqueue(sse({ t: 'error', v: String(err) }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e: any) {
    console.error('CodeThinker error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
