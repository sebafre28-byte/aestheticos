import { NextRequest, NextResponse } from 'next/server'
import type { NotificarCitaPayload } from '@/app/api/notificar-cita/route'

// Public endpoint for the booking page (unauthenticated patients).
// Validates the shape of the payload then forwards to notificar-cita with the internal secret.
export async function POST(req: NextRequest) {
  let body: NotificarCitaPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Basic validation — must be a booking notification, not an arbitrary relay
  if (!body.tipo || !body.paciente || !body.clinica || !body.inicio) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Only allow nueva_cita from the public booking page
  if (body.tipo !== 'nueva_cita') {
    return NextResponse.json({ ok: false, reason: 'tipo not allowed' }, { status: 403 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
  const secret = process.env.CRON_SECRET ?? ''

  await fetch(`${base}/api/notificar-cita`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify(body),
  }).catch((err) => console.error('[book/notificar]', err))

  return NextResponse.json({ ok: true })
}
