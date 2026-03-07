import { AgentId, AgentIntent } from './types';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const AGENT_DESCRIPTIONS: Record<AgentId, string> = {
  godlocal:    'General AI assistant, broad questions, ideas, strategy, anything not covered below',
  codethinker: 'Code writing, debugging, technical questions, programming, software architecture',
  nebudda:     'Social interaction, chat, emotional support, conversation, relationships',
  slonik:      'Crypto trading, Solana tokens, market analysis, DeFi, blockchain, prices',
};

export async function routeIntent(input: string): Promise<AgentIntent> {
  if (!GROQ_API_KEY) {
    return { agent: 'godlocal', confidence: 0.5, reason: 'No API key, default agent' };
  }

  const descriptions = Object.entries(AGENT_DESCRIPTIONS)
    .map(([id, desc]) => `- ${id}: ${desc}`)
    .join('\n');

  const systemPrompt = `You are a routing agent for GodLocal OS. Given a user message, decide which AI agent should handle it.\n\nAvailable agents:\n${descriptions}\n\nRespond with JSON only:\n{"agent": "<agent_id>", "confidence": 0.0-1.0, "reason": "<brief reason max 10 words>"}`;

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!res.ok) throw new Error(`Groq error: ${res.status}`);

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const validAgents: AgentId[] = ['godlocal', 'codethinker', 'nebudda', 'slonik'];
    const agent = validAgents.includes(parsed.agent as AgentId)
      ? (parsed.agent as AgentId)
      : 'godlocal';

    return {
      agent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      reason: parsed.reason ?? 'LLM routing',
    };
  } catch {
    return { agent: 'godlocal', confidence: 0.5, reason: 'Routing failed, using default' };
  }
}
