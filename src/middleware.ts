import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting: track requests per IP
const rateMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 60; // requests per window
const WINDOW_MS = 60_000; // 1 minute

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // ── Security Headers ──
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ── CORS for API routes ──
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = [
    'https://godlocal.ai',
    'https://www.godlocal.ai',
    'http://localhost:3000',
  ];

  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // ── Simple Rate Limiting ──
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  let entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    rateMap.set(key, entry);
  }
  entry.count++;

  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT - entry.count)));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > RATE_LIMIT) {
    return new NextResponse(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter: Math.ceil((entry.resetAt - now) / 1000) }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          ...Object.fromEntries(response.headers),
        },
      }
    );
  }

  // Cleanup old entries periodically
  if (rateMap.size > 10000) {
    for (const [k, v] of rateMap) {
      if (now > v.resetAt) rateMap.delete(k);
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
