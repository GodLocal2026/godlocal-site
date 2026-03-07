import { NextRequest } from 'next/server';
import { runKernelTask } from '@/lib/kernel/kernel';

export const runtime = 'edge';

/**
 * GodLocal OS Kernel — unified entry point
 * Routes any message to the correct agent via LLM intent classification.
 *
 * POST /api/kernel
 * Body: { message: string, history?: [...], session_id?: string }
 *
 * SSE events:
 *   { t: 'kernel_route', agent, reason, confidence }  <- routing decision
 *   { t: 'thinking', v: '...' }
 *   { t: 'token', v: '...' }
 *   { t: 'done' }
 *   { t: 'error', v: '...' }
 */
export async function POST(req: NextRequest) {
  let message: string;
  let history: Array<{ role: string; content: string }> = [];
  let session_id = '';

  try {
    const body = await req.json();
    message = body.message;
    history = body.history ?? [];
    session_id = body.session_id ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: '"message" field is required' }), { status: 400 });
  }

  const encoder = new TextEncoder();

  try {
    const { stream, agent, reason, confidence } = await runKernelTask(message, history, session_id);

    const routeEvent = encoder.encode(
      `data: ${JSON.stringify({ t: 'kernel_route', agent, reason, confidence })}\n\n`
    );

    const combinedStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(routeEvent);
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(combinedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    const errStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: 'error', v: msg })}\n\n`));
        controller.close();
      },
    });
    return new Response(errStream, { headers: { 'Content-Type': 'text/event-stream' } });
  }
}
