import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || 'solana meme coin'
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'SERPER_API_KEY not set', results: [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: q + ' site:x.com OR site:twitter.com',
        gl: 'us',
        hl: 'en',
        num: 12,
        tbs: 'qdr:d',  // last 24h
      }),
    })
    const data = await r.json()
    const results = (data.organic || []).map((item: Record<string,string>) => ({
      title   : item.title,
      snippet : item.snippet,
      link    : item.link,
      source  : item.displayLink || 'x.com',
    }))
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg, results: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
