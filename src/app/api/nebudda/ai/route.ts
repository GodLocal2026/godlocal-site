import { NextRequest, NextResponse } from 'next/server'

const GODLOCAL_API = process.env.GODLOCAL_API_URL || 'https://godlocal-api.onrender.com'

export async function POST(req: NextRequest) {
  const { message, channel } = await req.json()
  if (!message) return NextResponse.json({ error: 'no message' }, { status: 400 })

  try {
    const res = await fetch(`${GODLOCAL_API}/think`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        context: `Ты — GodLocal AI в чате канала #${channel}. Отвечай кратко и по делу. Ты часть NEBUDDA — социальной сети внутри GodLocal экосистемы.`,
        lang: 'ru',
      }),
      signal: AbortSignal.timeout(20000),
    })
    const data = await res.json()
    return NextResponse.json({ reply: data.response || data.result || data.answer || 'Нет ответа' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
