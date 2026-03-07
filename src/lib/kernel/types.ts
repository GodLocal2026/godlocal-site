export type AgentId = 'godlocal' | 'codethinker' | 'nebudda' | 'slonik';

export interface AgentIntent {
  agent: AgentId;
  confidence: number;
  reason: string;
}

export interface KernelTask {
  id: string;
  input: string;
  agent: AgentId;
  status: 'pending' | 'running' | 'done' | 'error';
  result?: string;
  createdAt: number;
}
