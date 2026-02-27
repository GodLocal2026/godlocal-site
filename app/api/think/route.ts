import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'https://godlocal-api.onrender.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/think`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backend unavailable';
    return NextResponse.json(
      { error: message, response: `⚠️ Backend unavailable: ${message}` },
      { status: 503 }
    );
  }
}
