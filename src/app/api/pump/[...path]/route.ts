import { NextRequest, NextResponse } from 'next/server';

const PUMP_BASE = 'https://frontend-api.pump.fun';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const path = (pathSegments ?? []).join('/');
  const search = req.nextUrl.search || '';
  const url = `${PUMP_BASE}/${path}${search}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GodLocal/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `pump.fun ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'pump.fun unreachable' }, { status: 502 });
  }
}
