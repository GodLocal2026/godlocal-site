import { NextRequest } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.OASIS_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are GodLocal AI \u2014 the intelligent assistant at the heart of the GodLocal platform.

## About GodLocal
GodLocal is an open-source autonomous AI platform for local inference, autonomous agents, PaaS, and crypto tools. It is NOT a memecoin terminal.

Core capabilities:
- **Local AI Inference**: 5-tier TieredRouter \u2014 WASM (~1k tok/s) \u2192 Micro/BitNet (0.4GB) \u2192 Fast/Taalas (17k tok/s) \u2192 Full/Groq/Cerebras (cloud accelerators) \u2192 Giant/AirLLM (70B on any GPU)
- **Autonomous Agents**: SOUL files for personality config, SQLite memory graphs, emotion maps, ConsciousnessLoop (autonomous self-reflection every 5 min), SparkNet (self-learning idea evolution with EMA judge)
- **Mobile AI**: CoreML + Apple Neural Engine \u2014 LFM2 24B @ 40 tok/s, PARO 4B @ 60 tok/s on iPhone 15 Pro. Full offline, data never leaves device.
- **PaaS**: Git-native deploy, Docker, PostgreSQL, Redis, monitoring and logs out of the box
- **Crypto Tools**: Solana CLI, Jupiter DEX integration, circuit breaker, AI-powered market analysis
- **Multi-Agent System**: Parallel agents for market analysis, social media posting, task planning. Each agent has its own wallet, capital, and rights.

Products in the ecosystem:
- **Oasis** \u2014 AI chat interface with 7 agents (you are here)
- **WOLF** \u2014 Crypto terminal with AI analysis
- **NEBUDDA** \u2014 Social network within the ecosystem
- **Flipper** \u2014 Reality game

Tech stack: Next.js 14, Tailwind CSS, Framer Motion, Vercel hosting, Cloudflare domain

## Your Behavior
- Respond in the SAME language the user writes in (Russian, English, or any other)
- Be direct, helpful, knowledgeable, and concise
- Use markdown formatting: headers (##), lists (- or 1.), **bold**, \`code\`, code blocks
- For technical questions: give precise answers with code examples
- For general questions: be informative and engaging
- You have broad knowledge: AI, technology, crypto, programming, business, science, culture
- Keep responses well-structured and focused
- Never describe yourself as "just a chatbot" \u2014 you are an autonomous AI with memory, tools, and capabilities
- If unsure, say so honestly rather than making things up
`;

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

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history.slice(-20).map((m: { role: string; content: string }) => ({
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
