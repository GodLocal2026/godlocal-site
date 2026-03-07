import { NextRequest, NextResponse } from 'next/server';
import { loadHistory, saveMessage, loadContext, saveContext } from '@/lib/memory/memory';

/**
 * GET  /api/memory?session_id=xxx[&limit=20]  — load history + context
 * POST /api/memory                             — save message or context
 *
 * POST body variants:
 *   { type: 'message', session_id, agent, role, content }
 *   { type: 'context', session_id, summary?, last_agent?, turn_count? }
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id') || '';
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  const [history, context] = await Promise.all([
    loadHistory(session_id, limit),
    loadContext(session_id),
  ]);

  return NextResponse.json({ session_id, history, context });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === 'message') {
    const { session_id, agent, role, content } = body;
    if (!session_id || !role || !content) {
      return NextResponse.json({ error: 'session_id, role, content required' }, { status: 400 });
    }
    await saveMessage({ session_id, agent: agent || 'godlocal', role, content });
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'context') {
    const { session_id, summary, last_agent, turn_count } = body;
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }
    await saveContext({ session_id, summary, last_agent, turn_count });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'type must be "message" or "context"' }, { status: 400 });
}
