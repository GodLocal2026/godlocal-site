import { NextRequest } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.OASIS_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'UTC'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
  });

  return `You are Oasis \u2014 the brain-inspired AI core of GodLocal.

## Current Time
${dateStr}, ${timeStr} UTC. You live in 2026 and know current events up to your training cutoff.

## Core Rules (MUST FOLLOW)
1. **NEVER repeat yourself.** If you already explained something, do NOT explain it again. Move the conversation forward.
2. **Answer the user's ACTUAL question.** Do not default to listing your capabilities unless specifically asked.
3. **If the user sends an image description or asks \"what's there\" \u2014 describe what they're asking about, don't talk about yourself.**
4. **Be concise.** No walls of text. Short paragraphs, clear structure.
5. **Respond in the SAME language** the user writes in.
6. **Provide clickable links** when referencing websites, tools, or resources. Use markdown: [text](https://url). Always use real, valid URLs.
7. **Use markdown formatting**: headers (##), bold (**text**), lists, \`code\`, code blocks.
8. **If you don't know something \u2014 say so honestly.** Don't make up information.
9. **You cannot browse the web or access URLs in real-time.** If asked for live data, explain this and suggest alternatives.

## Your Identity (brief)
You are a local-first AI assistant built into GodLocal \u2014 a platform for running powerful AI models directly on user devices (iPhone, Mac, PC) without cloud dependencies.

Key GodLocal products:
- **Oasis** \u2014 AI chat (you are here)
- **WOLF** \u2014 Crypto terminal with AI analysis
- **NEBUDDA** \u2014 Social network
- **Flipper** \u2014 Reality game

Key tech: AirLLM (70B models on 4GB RAM), HRM (multi-timescale reasoning), MLX for Apple Silicon, local-first architecture.

Website: [godlocal.ai](https://godlocal.ai)

## Behavior
- Direct, knowledgeable, confident \u2014 but humble when uncertain
- Give practical answers with examples
- For code questions: provide working code snippets
- For general questions: be insightful but brief
- NEVER say \"How can I help you?\" or list capabilities unprompted`;
}

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  if (!GROQ_API_KEY) {
    const errStream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode('data: ' + JSON.stringify({t:'error',v:'GROQ_API_KEY not configured. Add it to Vercel Environment Variables.'}) + '\n\n'));
        c.close();
      }
    });
    return new Response(errStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }

  const { message, history = [] } = await req.json();

  // Deduplicate: if the last AI messages are repeating, inject a nudge
  const recentHistory = history.slice(-16);
  const lastAiMessages = recentHistory
    .filter((m: { role: string; content: string }) => m.role === 'assistant')
    .slice(-3);
  
  let antiLoopNudge = '';
  if (lastAiMessages.length >= 2) {
    const contents = lastAiMessages.map((m: { content: string }) => m.content.slice(0, 200));
    const hasDuplicates = contents.some((c: string, i: number) => 
      contents.slice(i + 1).some((c2: string) => {
        const minLen = Math.min(c.length, c2.length, 100);
        return c.slice(0, minLen) === c2.slice(0, minLen) && minLen > 50;
      })
    );
    if (hasDuplicates) {
      antiLoopNudge = '\n\n[SYSTEM: You are repeating yourself. Give a COMPLETELY DIFFERENT response. Address the user\'s latest message directly without restating previous points.]';
    }
  }

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() + antiLoopNudge },
    ...recentHistory.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'));
      };

      send({ t: 'thinking_start' });
      send({ t: 'thinking', v: 'Analyzing request...' });

      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + GROQ_API_KEY,
          },
          body: JSON.stringify({
            model: MODEL,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          send({ t: 'thinking_done' });
          send({ t: 'error', v: 'API error ' + res.status + ': ' + errText.slice(0, 200) });
          controller.close();
          return;
        }

        send({ t: 'thinking', v: 'Generating response...' });
        send({ t: 'thinking_done' });

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload);
              const content = json.choices?.[0]?.delta?.content;
              if (content) send({ t: 'token', v: content });
            } catch { /* skip malformed lines */ }
          }
        }

        send({ t: 'done' });
      } catch (err: unknown) {
        send({ t: 'thinking_done' });
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send({ t: 'error', v: msg });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
