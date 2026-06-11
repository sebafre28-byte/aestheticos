import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificarCitaPayload } from '@/app/api/notificar-cita/route'

// Public endpoint for the booking page (unauthenticated patients).
// Requires cita_id to validate the booking is real and fetch clinic email from DB,
// preventing email injection attacks.
export async function POST(req: NextRequest) {
  let body: NotificarCitaPayload & { cita_id?: string }
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

  // If cita_id is provided, fetch real clinic email from DB to prevent email injection
  if (body.cita_id) {
    try {
      const supabase = createAdminClient()
      const { data: cita } = await supabase
        .from('citas')
        .select('clinica_id, clinicas(email, nombre, telefono, direccion, logo_url)')
        .eq('id', body.cita_id)
        .single()

      if (cita) {
        const clinica = Array.isArray(cita.clinicas) ? cita.clinicas[0] : cita.clinicas
        // Override caller-supplied clinic email with verified DB value
        body = {
          ...body,
          clinica: {
            ...body.clinica,
            email: (clinica as { email?: string | null } | null)?.email ?? null,
          },
          email_admin: (clinica as { email?: string | null } | null)?.email ?? undefined,
        }
      }
    } catch (err) {
      console.error('[book/notificar] clinica lookup error:', err)
    }
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
  const secret = process.env.INTERNAL_API_SECRET ?? ''

  await fetch(`${base}/api/notificar-cita`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify(body),
  }).catch((err) => console.error('[book/notificar]', err))

  // Sync to Google Calendar if a real cita was created
  if (body.cita_id) {
    fetch(`${base}/api/citas/sync-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify({ cita_id: body.cita_id, action: 'create' }),
    }).catch((err) => console.error('[book/notificar] google sync error:', err))
  }

  return NextResponse.json({ ok: true })
}
