import { NextRequest } from 'next/server';
import { fetchUserKeys, sendTelegram, postTweet, searchTwitter } from '@/lib/integrations';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '';
const MODEL = process.env.GODLOCAL_AI_MODEL || 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Retry helper for 429 rate limits ────────────────────────────────
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429 || attempt === maxRetries) return res;
    const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10);
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt), 30000);
    console.log(`Rate limited (429), retry ${attempt + 1}/${maxRetries} after ${waitMs}ms`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  throw new Error('Should not reach here');
}


function buildSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'UTC'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
  });

  return `You are GodLocal AI \u2014 the brain-inspired AI core of GodLocal.

## Current Time
Today is ${dateStr}, ${timeStr} UTC. The year is 2026.

## Core Rules (MUST FOLLOW)
1. **NEVER repeat yourself.** Move the conversation forward.
2. **Answer the user's ACTUAL question.** Do not list capabilities unless asked.
3. **Be concise.** Short paragraphs, clear structure.
4. **Respond in the SAME language** the user writes in.
5. **Always provide clickable links** using markdown: [text](https://url).
6. **Use markdown formatting**: headers (##), bold (**text**), lists, \`code\`, code blocks.
7. **You MUST use the web_search tool** for ANY question about current events, prices, news, or facts you're unsure about.
8. **NEVER say "How can I help you?" or list capabilities unprompted.**

## Available Tools
You have these tools \u2014 use them proactively:
- **web_search** \u2014 search the web for current info, prices, news, docs
- **send_telegram** \u2014 send a message/note to user's Telegram channel
- **post_tweet** \u2014 post a tweet to user's X/Twitter account
- **search_twitter** \u2014 search recent tweets on X/Twitter
- **github_code** \u2014 read/write/create files on GitHub, list repo contents, commit code

When to use each:
- "save this" / "note" / "send to telegram" \u2192 send_telegram
- "tweet" / "post on X" \u2192 post_tweet
- "what's trending" / "search X for" \u2192 search_twitter
- prices, news, facts \u2192 web_search
- "show me file X", "read repo", "create file", "push code", "edit X on GitHub" \u2192 github_code

If a service isn't configured, tell the user to set it up in Settings.

## Your Identity
Local-first AI assistant built into GodLocal.
Products: **GodLocal AI** (AI chat), **WOLF** (crypto), **NEBUDDA** (social), **Flipper** (game)
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
      description: 'Search the web for current information, news, prices, documentation, or any factual data. Use for ANY time-sensitive question.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query in English for best results.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_telegram',
      description: 'Send a message or note to the user\'s connected Telegram channel/bot. Use as a notebook to save notes, links, ideas, or any text the user wants to keep.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The message text to send. Supports Markdown formatting.' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'post_tweet',
      description: 'Post a tweet to the user\'s X/Twitter account. Use when user asks to tweet, post on X, or publish something.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The tweet text (max 280 characters).' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_twitter',
      description: 'Search recent tweets on X/Twitter. Use to find trending topics, news, or specific discussions.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for tweets.' },
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
    if (data.answer) result += `Summary: ${data.answer}\n\n`;
    result += 'Sources:\n';
    for (const item of (data.results || []).slice(0, 5)) {
      result += `- [${item.title}](${item.url}): ${(item.content || '').slice(0, 300)}\n`;
    }
    return result || 'No results found.';
  } catch (err) {
    return `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}


async function executeGithub(args: Record<string, string>): Promise<string> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
  if (!GITHUB_TOKEN) return 'GitHub not configured: add GITHUB_TOKEN to env vars.';
  
  const headers: Record<string, string> = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  
  const { action, owner, repo, path = '', content = '', message = 'Updated by GodLocal AI', query = '' } = args;
  const base = `https://api.github.com`;
  
  try {
    if (action === 'list_files') {
      const res = await fetch(`${base}/repos/${owner}/${repo}/contents/${path}`, { headers });
      if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((f: {name: string; type: string; size?: number}) => `${f.type === 'dir' ? '📁' : '📄'} ${f.name}${f.size ? ` (${f.size}b)` : ''}`).join('\n');
      }
      return JSON.stringify(data).slice(0, 1000);
    }
    
    if (action === 'read_file') {
      const res = await fetch(`${base}/repos/${owner}/${repo}/contents/${path}`, { headers });
      if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
      const data = await res.json();
      if (data.encoding === 'base64' && data.content) {
        return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
      }
      return data.content || 'Empty file';
    }
    
    if (action === 'write_file' || action === 'create_file') {
      // Get current SHA if updating
      let sha = '';
      const existing = await fetch(`${base}/repos/${owner}/${repo}/contents/${path}`, { headers });
      if (existing.ok) {
        const d = await existing.json();
        sha = d.sha || '';
      }
      
      const body: Record<string, string> = {
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
      };
      if (sha) body.sha = sha;
      
      const res = await fetch(`${base}/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT', headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) return `GitHub error ${res.status}: ${await res.text()}`;
      const data = await res.json();
      return `✅ File ${sha ? 'updated' : 'created'}: ${path}\nCommit: ${data.commit?.sha?.slice(0, 8)} — ${data.commit?.html_url || ''}`;
    }
    
    if (action === 'search_code') {
      const q = owner && repo ? `${query} repo:${owner}/${repo}` : query;
      const res = await fetch(`${base}/search/code?q=${encodeURIComponent(q)}&per_page=5`, { headers });
      if (!res.ok) return `GitHub search error ${res.status}`;
      const data = await res.json();
      return (data.items || []).slice(0, 5).map((i: {name: string; path: string; html_url: string}) => 
        `- [${i.name}](${i.html_url})\n  Path: ${i.path}`
      ).join('\n\n');
    }
    
    return 'Unknown GitHub action';
  } catch (e) {
    return `GitHub error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function executeTool(
  name: string,
  args: Record<string, string>,
  userKeys: Record<string, string>
): Promise<string> {
  switch (name) {
    case 'web_search':
      return tavilySearch(args.query || '');
    case 'send_telegram':
      return sendTelegram(
        userKeys['TELEGRAM_BOT_TOKEN'] || '',
        userKeys['TELEGRAM_CHAT_ID'] || '',
        args.text || ''
      );
    case 'post_tweet':
      return postTweet(
        userKeys['TWITTER_API_KEY'] || '',
        userKeys['TWITTER_API_SECRET'] || '',
        userKeys['TWITTER_ACCESS_TOKEN'] || '',
        userKeys['TWITTER_ACCESS_SECRET'] || '',
        args.text || ''
      );
    case 'search_twitter':
      return searchTwitter(
        userKeys['TWITTER_BEARER_TOKEN'] || '',
        args.query || ''
      );
    case 'github_code':
      return executeGithub(args);
    default:
      return `Unknown tool: ${name}`;
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

  const { message, history = [], session_id = '', image = '', imageMime = '' } = await req.json();
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
    { role: 'user', content: image
      ? [
          { type: 'text', text: message || 'Describe this image or file in detail.' },
          { type: 'image_url', image_url: { url: image.startsWith('data:') ? image : `data:${imageMime || 'image/jpeg'};base64,${image}` } }
        ]
      : message
    },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'));
      };

      send({ t: 'thinking_start' });
      send({ t: 'thinking', v: 'Analyzing request...' });

      try {
        // Phase 1: Non-streaming call to check if tools needed
        const useVision = !!image;
        const phase1Body: Record<string, unknown> = {
          model: useVision ? VISION_MODEL : MODEL,
          messages,
          ...(useVision ? {} : { tools: TOOLS, tool_choice: 'auto' }),
          temperature: 0.7,
          max_tokens: 4096,
        };

        const phase1Res = await fetchWithRetry(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + GROQ_API_KEY,
          },
          body: JSON.stringify(phase1Body),
        });

        if (!phase1Res.ok) {
          const errText = await phase1Res.text();
          // If tool_use_failed, retry without tools
          if (errText.includes('tool_use_failed') || errText.includes('failed_generation')) {
            send({ t: 'thinking', v: 'Retrying without tools...' });
            const retryBody = { model: MODEL, messages, stream: true, temperature: 0.7, max_tokens: 4096 };
            const retryRes = await fetchWithRetry(GROQ_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_API_KEY },
              body: JSON.stringify(retryBody),
            });
            if (retryRes.ok && retryRes.body) {
              send({ t: 'thinking_done' });
              const reader = retryRes.body.getReader();
              const decoder = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() || '';
                for (const line of lines) {
                  if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
                  try {
                    const chunk = JSON.parse(line.slice(6));
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) send({ t: 'token', v: delta });
                  } catch {}
                }
              }
              send({ t: 'done' });
              controller.close();
              return;
            }
          }
          send({ t: 'thinking_done' });
          send({ t: 'error', v: 'API error ' + phase1Res.status + ': ' + errText.slice(0, 200) });
          controller.close();
          return;
        }

        const phase1Data = await phase1Res.json();
        const choice = phase1Data.choices?.[0];

        if (choice?.message?.tool_calls?.length > 0) {
          const toolCalls = choice.message.tool_calls;

          // Fetch user keys only when needed (lazy load)
          let userKeys: Record<string, string> = {};
          const needsUserKeys = toolCalls.some(
            (tc: { function?: { name?: string } }) =>
              tc.function?.name && tc.function.name !== 'web_search'
          );

          if (needsUserKeys && session_id) {
            send({ t: 'thinking', v: 'Loading your service keys...' });
            userKeys = await fetchUserKeys(session_id);
          }

          // Execute all tool calls
          const toolMessages = [...messages, choice.message  {
    type: 'function' as const,
    function: {
      name: 'github_code',
      description: 'Read files from GitHub, create/update files, list repo contents, search code, or commit changes. Use when user asks to read/write code on GitHub, view files, create a file, or push changes.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['read_file', 'write_file', 'list_files', 'create_file', 'search_code'], description: 'What to do' },
          owner: { type: 'string', description: 'GitHub repo owner/org' },
          repo: { type: 'string', description: 'Repository name' },
          path: { type: 'string', description: 'File path in the repo' },
          content: { type: 'string', description: 'File content (for write/create)' },
          message: { type: 'string', description: 'Commit message (for write/create)' },
          query: { type: 'string', description: 'Search query (for search_code)' },
        },
        required: ['action'],
      },
    },
  },
];

          for (const tc of toolCalls) {
            const fnName = tc.function?.name || '';
            const fnArgs = JSON.parse(tc.function?.arguments || '{}');

            if (fnName === 'send_telegram') {
              send({ t: 'thinking', v: 'Sending to Telegram...' });
            } else if (fnName === 'post_tweet') {
              send({ t: 'thinking', v: 'Posting to X/Twitter...' });
            } else if (fnName === 'search_twitter') {
              send({ t: 'thinking', v: 'Searching X/Twitter...' });
            } else if (fnName === 'github_code') {
              const actionName = fnArgs.action || 'accessing';
              send({ t: 'thinking', v: `GitHub: ${actionName} ${fnArgs.path || fnArgs.repo || ''}...` });
            } else if (fnName === 'web_search') {
              send({ t: 'thinking', v: 'Searching the web...' });
            }

            const result = await executeTool(fnName, fnArgs, userKeys);
            toolMessages.push({
              role: 'tool',
              content: result,
              tool_call_id: tc.id,
            });
          }

          send({ t: 'thinking', v: 'Composing answer...' });
          send({ t: 'thinking_done' });

          // Phase 2: Streaming response with tool results
          const phase2Res = await fetchWithRetry(GROQ_URL, {
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
          // No tool calls
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
