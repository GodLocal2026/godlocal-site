import { routeIntent } from './router';
import { AgentId, KernelTask } from './types';

const AGENT_ENDPOINTS: Record<AgentId, string> = {
  godlocal:    '/api/ai/chat',
  codethinker: '/api/codethinker/chat',
  nebudda:     '/api/nebudda/ai',
  slonik:      '/api/ai/chat',
};

const AGENT_SYSTEM_OVERRIDES: Partial<Record<AgentId, string>> = {
  slonik:  'You are Slonik52 — a Solana crypto trading AI. Analyze tokens, liquidity, market trends. Be concise and data-driven.',
  nebudda: 'You are Nebudda — a social AI companion. Be warm, engaging, and empathetic.',
};

export async function runKernelTask(
  input: string,
  history: Array<{ role: string; content: string }> = [],
  sessionId = ''
): Promise<{ stream: ReadableStream; agent: AgentId; reason: string; confidence: number }> {

  const intent = await routeIntent(input);

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const endpoint = AGENT_ENDPOINTS[intent.agent];
  const systemPromptOverride = AGENT_SYSTEM_OVERRIDES[intent.agent];

  const body: Record<string, unknown> = { message: input, history, session_id: sessionId };
  if (systemPromptOverride) body.system_prompt_override = systemPromptOverride;

  const agentRes = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!agentRes.ok || !agentRes.body) {
    throw new Error(`Agent ${intent.agent} returned ${agentRes.status}`);
  }

  return {
    stream: agentRes.body as ReadableStream,
    agent: intent.agent,
    reason: intent.reason,
    confidence: intent.confidence,
  };
}

export type { AgentId, KernelTask };
