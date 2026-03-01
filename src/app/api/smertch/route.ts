import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'static', 'pwa', 'smertch.html');
    const html = readFileSync(filePath, 'utf-8');
    return new NextResponse(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
