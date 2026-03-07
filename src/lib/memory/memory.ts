import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export interface MemoryMessage {
  id?: string;
  session_id: string;
  agent: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface SessionContext {
  session_id: string;
  summary?: string;
  last_agent?: string;
  turn_count?: number;
  updated_at?: string;
}

// ── Messages ──────────────────────────────────────────────

export async function saveMessage(msg: Omit<MemoryMessage, 'id' | 'created_at'>): Promise<void> {
  const db = getClient();
  if (!db) return; // graceful degradation if Supabase not configured

  await db.from('kernel_messages').insert(msg);
}

export async function loadHistory(
  session_id: string,
  limit = 20
): Promise<MemoryMessage[]> {
  const db = getClient();
  if (!db) return [];

  const { data } = await db
    .from('kernel_messages')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data || []) as MemoryMessage[]).reverse();
}

// ── Session Context ───────────────────────────────────────

export async function saveContext(ctx: SessionContext): Promise<void> {
  const db = getClient();
  if (!db) return;

  await db
    .from('kernel_sessions')
    .upsert({ ...ctx, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
}

export async function loadContext(session_id: string): Promise<SessionContext | null> {
  const db = getClient();
  if (!db) return null;

  const { data } = await db
    .from('kernel_sessions')
    .select('*')
    .eq('session_id', session_id)
    .single();

  return (data as SessionContext) ?? null;
}

// ── Cross-session Recall (semantic-lite: recent N messages across agents) ─

export async function recallRecent(limit = 50): Promise<MemoryMessage[]> {
  const db = getClient();
  if (!db) return [];

  const { data } = await db
    .from('kernel_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data || []) as MemoryMessage[]).reverse();
}
