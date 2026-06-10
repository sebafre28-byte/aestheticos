import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'TURNSTILE_SECRET_KEY no configurado' }, { status: 500 })
    }
    return NextResponse.json({ success: true }) // dev mode only
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }).toString(),
  })
  const data = await res.json() as { success: boolean }
  if (!data.success) {
    return NextResponse.json({ error: 'Verificación de seguridad fallida' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
