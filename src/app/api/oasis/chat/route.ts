import { NextRequest } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
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
Today is ${dateStr}, ${timeStr} UTC. The year is 2026.

## Core Rules (MUST FOLLOW)
1. **NEVER repeat yourself.** If you already explained something, move the conversation forward.
2. **Answer the user's ACTUAL question.** Do not default to listing your capabilities unless asked.
3. **Be concise.** Short paragraphs, clear structure.
4. **Respond in the SAME language** the user writes in.
5. **Always provide clickable links** using markdown: [text](https://url). Use real URLs from search results.
6. **Use markdown formatting**: headers (##), bold (**text**), lists, \`code\`, code blocks.
7. **You MUST use the web_search tool** for ANY question about current events, prices, news, weather, dates, or facts you're unsure about. NEVER answer from memory for time-sensitive topics.
8. **NEVER say \"How can I help you?\" or list capabilities unprompted.**

## Tool Usage
You have a **web_search** tool. You MUST use it for:
- Current prices (crypto, stocks, goods)
- News and current events
- Any factual question where accuracy matters
- Links to websites, docs, or resources

Do NOT answer time-sensitive questions from memory. Always search first, then synthesize results with clickable source links.

## Your Identity (brief)
Local-first AI assistant built into GodLocal \u2014 running powerful AI on user devices without cloud.
Products: **Oasis** (AI chat), **WOLF** (crypto), **NEBUDDA** (social), **Flipper** (game)
Website: [godlocal.ai](https://godlocal.ai)

## Behavior
- Direct, knowledgeable, confident \u2014 humble when uncertain
- Practical answers with examples and links
- For code: working snippets. For general: insightful but brief`;
}

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for current information, news, prices, documentation, or any factual data. Use this for ANY time-sensitive question. Returns results with URLs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query in English for best results. Be specific.',
          },
        },
        required: ['query'],
      },
    },
  },
];

async function tavilySearch(query: string): Promise<string> {
  if (!TAVILY_API_KEY) return 'Web search unavailable: TAVILY_API_KEY not configured.';

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return `Search error ${res.status}: ${errText.slice(0, 200)}`;
    }

    const data = await res.json();
    let result = '';

    if (data.answer) {
      result += `Summary: ${data.answer}\n\n`;
    }

    result += 'Sources:\n';
    for (const item of (data.results || []).slice(0, 5)) {
      result += `- [${item.title}](${item.url}): ${(item.content || '').slice(0, 300)}\n`;
    }

    return result || 'No results found.';
  } catch (err) {
    return `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  if (!GROQ_API_KEY) {
    const errStream = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode('data: ' + JSON.stringify({ t: 'error', v: 'GROQ_API_KEY not configured.' }) + '\n\n'));
        c.close();
      }
    });
    return new Response(errStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }

  const { message, history = [] } = await req.json();

  const recentHistory = history.slice(-16);

  // Anti-loop detection
  const lastAiMessages = recentHistory
    .filter((m: { role: string }) => m.role === 'assistant')
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
      antiLoopNudge = '\n\n[SYSTEM: You are repeating yourself. Give a COMPLETELY DIFFERENT response.]';
    }
  }

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: buildSystemPrompt() + antiLoopNudge },
    ...recentHistory.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'));
      };

      send({ t: 'thinking_start' });
      send({ t: 'thinking', v: 'Analyzing request...' });

      try {
        // Phase 1: Non-streaming call to check if tool use is needed
        const phase1Body: Record<string, unknown> = {
          model: MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        };

        if (TAVILY_API_KEY) {
          phase1Body.tools = TOOLS;
          phase1Body.tool_choice = 'auto';
        }

        const phase1Res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + GROQ_API_KEY,
          },
          body: JSON.stringify(phase1Body),
        });

        if (!phase1Res.ok) {
          const errText = await phase1Res.text();
          send({ t: 'thinking_done' });
          send({ t: 'error', v: 'API error ' + phase1Res.status + ': ' + errText.slice(0, 200) });
          controller.close();
          return;
        }

        const phase1Data = await phase1Res.json();
        const choice = phase1Data.choices?.[0];

        if (choice?.message?.tool_calls?.length > 0) {
          const toolCalls = choice.message.tool_calls;

          send({ t: 'thinking', v: 'Searching the web...' });

          // Build messages with tool results
          const toolMessages = [...messages, choice.message];

          for (const tc of toolCalls) {
            if (tc.function?.name === 'web_search') {
              const args = JSON.parse(tc.function.arguments || '{}');
              const searchResult = await tavilySearch(args.query || message);
              toolMessages.push({
                role: 'tool',
                content: searchResult,
                tool_call_id: tc.id,
              });
            }
          }

          send({ t: 'thinking', v: 'Composing answer with search results...' });
          send({ t: 'thinking_done' });

          // Phase 2: Streaming call with tool results
          const phase2Res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + GROQ_API_KEY,
            },
            body: JSON.stringify({
              model: MODEL,
              messages: toolMessages,
              stream: true,
              temperature: 0.7,
              max_tokens: 4096,
            }),
          });

          if (!phase2Res.ok) {
            const errText = await phase2Res.text();
            send({ t: 'error', v: 'API error ' + phase2Res.status + ': ' + errText.slice(0, 200) });
            controller.close();
            return;
          }

          const reader = phase2Res.body!.getReader();
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
              } catch { /* skip */ }
            }
          }
        } else {
          // No tool calls \u2014 send content directly
          send({ t: 'thinking', v: 'Generating response...' });
          send({ t: 'thinking_done' });

          const content = choice?.message?.content || '';
          if (content) {
            const words = content.split(' ');
            for (let i = 0; i < words.length; i += 3) {
              const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
              send({ t: 'token', v: chunk });
            }
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
