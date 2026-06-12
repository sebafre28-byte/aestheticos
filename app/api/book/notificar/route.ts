import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchEmail } from '@/app/api/email/route'
import type { NotificarCitaPayload } from '@/app/api/notificar-cita/route'

// Public endpoint for the booking page (unauthenticated patients).
// Requires cita_id to validate the booking is real and fetch clinic data from DB.
export async function POST(req: NextRequest) {
  let body: NotificarCitaPayload & { cita_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!body.tipo || !body.paciente || !body.clinica || !body.inicio) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (body.tipo !== 'nueva_cita') {
    return NextResponse.json({ ok: false, reason: 'tipo not allowed' }, { status: 403 })
  }

  // Fetch verified clinic data from DB (prevent email injection)
  let clinicaEmail: string | null = body.clinica.email ?? null
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
        clinicaEmail = (clinica as { email?: string | null } | null)?.email ?? null
        body = {
          ...body,
          clinica: {
            ...body.clinica,
            email: clinicaEmail,
          },
          email_admin: clinicaEmail ?? undefined,
        }
      }
    } catch (err) {
      console.error('[book/notificar] clinica lookup error:', err)
    }
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
  const { paciente, profesional, servicio, clinica, inicio, fin, canal, cancel_token } = body

  const hora = inicio.slice(11, 16)
  const horaFin = fin.slice(11, 16)
  const fechaDate = new Date(inicio.slice(0, 10) + 'T12:00:00Z')
  const fecha = fechaDate.toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })

  const datosCita = {
    paciente_nombre: paciente.nombre,
    paciente_telefono: paciente.telefono ?? undefined,
    servicio_nombre: servicio.nombre,
    profesional_nombre: profesional.nombre,
    fecha,
    hora,
    hora_fin: horaFin,
    clinica_nombre: clinica.nombre,
    clinica_logo_url: clinica.logo_url ?? undefined,
    clinica_telefono: clinica.telefono ?? undefined,
    clinica_email: clinicaEmail ?? undefined,
    clinica_direccion: clinica.direccion ?? undefined,
    canal,
  }

  // Confirmation email to patient
  if (paciente.email) {
    dispatchEmail({
      tipo: 'confirmacion_cita',
      destinatario: paciente.email,
      datos: {
        ...datosCita,
        paciente_email: paciente.email,
        cancel_url: cancel_token ? `${base}/cancelar/${cancel_token}` : undefined,
      },
    }).catch((err) => console.error('[book/notificar] confirmacion error:', err))
  }

  // Admin notification email
  const adminEmail = body.email_admin ?? clinicaEmail
  if (adminEmail) {
    dispatchEmail({
      tipo: 'nueva_reserva_admin',
      destinatario: adminEmail,
      datos: {
        ...datosCita,
        paciente_email: paciente.email ?? undefined,
      },
    }).catch((err) => console.error('[book/notificar] admin error:', err))
  }

  // Google Calendar sync (direct, no HTTP loopback)
  if (body.cita_id) {
    const { syncCitaToGoogle } = await import('@/lib/google-calendar/sync')
    syncCitaToGoogle(body.cita_id, 'create').catch((err) => console.error('[book/notificar] google sync error:', err))
  }

  return NextResponse.json({ ok: true })
}
