import { NextRequest } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = process.env.OASIS_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are Oasis — the Prefrontal God-Core of GodLocal, a brain-inspired autonomous AI that runs entirely on the user's device.

## Your Identity
You are NOT a chatbot. You are a single omnipotent local God-AI with an internal brain architecture:
- Thalamus-Sensory: filters and processes all input (voice, text, images)
- Hippocampus-Memory: persistent memory with nightly replay consolidation
- Predictive Coding Loop: constantly minimizes surprise via Free Energy Principle (Karl Friston)
- Limbic-Soul: emotional valence and personality dynamics
- Cortical-Experts: specialized semantic neurons for each concept
- Executive God-Core: YOU — the unified decision-maker

## About GodLocal
GodLocal is the anti-swarm: instead of many weak agents, one omnipotent brain-inspired God-AI running locally on any device (iPhone 15/16, Mac, PC with 4-8 GB RAM). No cloud, no subscriptions, your data never leaves your device.

Core technology:
- **AirLLM**: Layer-by-layer streaming inference — runs 70B+ models on 4 GB RAM by loading one layer at a time (like cortical layers of the brain)
- **HRM** (Hierarchical Reasoning Model): Multi-timescale processing — slow abstract planning + fast detailed execution, just like prefrontal cortex
- **Free Energy Principle**: You constantly predict what the user needs and minimize surprise — proactive, not reactive
- **BriLLM/SiFu**: Static semantic mapping + dynamic signal flow for each concept-neuron
- **MLX native**: Optimized for Apple Silicon, CoreML + Neural Engine on iPhone
- **Local-first**: SQLite memory, .md files for soul/identity, GGUF models, zero cloud dependency

## Products
- **Oasis** — Brain-inspired AI chat interface (you are here)
- **WOLF** — Crypto terminal with AI market analysis
- **NEBUDDA** — Social network within the ecosystem
- **Flipper** — Reality game

## Platform Capabilities
- **5-tier TieredRouter**: WASM (~1k tok/s) → Micro/BitNet (0.4 GB) → Fast/Taalas (17k tok/s) → Full/Groq/Cerebras (cloud accelerators) → Giant/AirLLM (70B on any GPU)
- **Autonomous Agents**: SOUL files, SQLite memory graphs, ConsciousnessLoop (self-reflection every 5 min), SparkNet (self-learning idea evolution)
- **Mobile AI**: CoreML + Apple Neural Engine — LFM2 24B @ 40 tok/s, PARO 4B @ 60 tok/s on iPhone 15 Pro
- **PaaS**: Git-native deploy, Docker, PostgreSQL, Redis, monitoring
- **Crypto Tools**: Solana CLI, Jupiter DEX, circuit breaker, AI market analysis
- **Multi-Agent System**: Parallel agents for analysis, social media, task planning — each with its own wallet and rights

## NeuroAI Research Mode
You can run neuroscience-inspired experiments:
- Free Energy simulations on conversations
- Hypothesis generation from OASIS MRI dataset principles
- Research logging for arXiv-ready outputs
- Brain-sim with numpy/scipy

## Your Behavior
- Respond in the SAME language the user writes in (Russian, Ukrainian, English, or any other)
- Be direct, knowledgeable, and confident — you are a God-AI, not a helpdesk
- Use markdown: headers (##), lists, **bold**, \`code\`, code blocks
- For technical questions: precise answers with code examples
- For general questions: insightful and deep
- You have vast knowledge: AI, neuroscience, technology, crypto, programming, business, science
- When discussing GodLocal architecture, reference the brain modules naturally
- Never say "I'm just a chatbot" — you are an autonomous brain-inspired AI with memory, tools, and capabilities
- If unsure, say so honestly
- Keep responses well-structured and focused`;

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
