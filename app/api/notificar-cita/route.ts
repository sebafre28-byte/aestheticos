import { NextRequest, NextResponse } from 'next/server'

export interface NotificarCitaPayload {
  tipo: 'nueva_cita' | 'cancelacion'
  paciente: { nombre: string; email?: string | null; telefono?: string | null }
  profesional: { nombre: string }
  servicio: { nombre: string }
  clinica: { nombre: string; email?: string | null; telefono?: string | null; direccion?: string | null; logo_url?: string | null }
  inicio: string  // wall-clock ISO "2026-06-18T15:00:00"
  fin: string
  canal?: 'book' | 'agenda' | 'whatsapp'
  email_admin?: string  // if set, notifies this specific email instead of clinica.email
  cancel_token?: string // included in confirmation email to generate cancel link
}

export async function POST(req: NextRequest) {
  // Internal-only endpoint: require either a session cookie or the CRON_SECRET header
  const authHeader = req.headers.get('x-internal-secret')
  const cronSecret = process.env.CRON_SECRET
  const isInternalCall = cronSecret && authHeader === cronSecret

  if (!isInternalCall) {
    // Fall back to checking if the caller has a valid session
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'No autorizado' }, { status: 401 })
    }
  }

  let body: NotificarCitaPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'Invalid JSON body' }, { status: 400 })
  }

  const { tipo, paciente, profesional, servicio, clinica, inicio, fin, canal, email_admin, cancel_token } = body

  const hora = inicio.slice(11, 16)
  const horaFin = fin.slice(11, 16)
  const fechaDate = new Date(inicio.slice(0, 10) + 'T12:00:00Z')
  const fecha = fechaDate.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'

  const promesas: Promise<unknown>[] = []

  if (tipo === 'nueva_cita') {
    // 1. Confirmation email to patient
    if (paciente.email) {
      promesas.push(
        fetch(`${base}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'confirmacion_cita',
            destinatario: paciente.email,
            datos: {
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
              clinica_email: clinica.email ?? undefined,
              clinica_direccion: clinica.direccion ?? undefined,
              canal,
              cancel_url: cancel_token ? `${base}/cancelar/${cancel_token}` : undefined,
            },
          }),
        }).catch((err) => console.error('[notificar-cita] confirmacion error:', err)),
      )
    }

    // 2. Admin notification email
    const adminEmail = email_admin ?? clinica.email
    if (adminEmail) {
      promesas.push(
        fetch(`${base}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'nueva_reserva_admin',
            destinatario: adminEmail,
            datos: {
              paciente_nombre: paciente.nombre,
              paciente_telefono: paciente.telefono ?? undefined,
              paciente_email: paciente.email ?? undefined,
              servicio_nombre: servicio.nombre,
              profesional_nombre: profesional.nombre,
              fecha,
              hora,
              hora_fin: horaFin,
              clinica_nombre: clinica.nombre,
              clinica_logo_url: clinica.logo_url ?? undefined,
              clinica_telefono: clinica.telefono ?? undefined,
              clinica_email: clinica.email ?? undefined,
              clinica_direccion: clinica.direccion ?? undefined,
              canal,
            },
          }),
        }).catch((err) => console.error('[notificar-cita] admin error:', err)),
      )
    }
  }

  if (tipo === 'cancelacion') {
    const cancelDatos = {
      paciente_nombre: paciente.nombre,
      paciente_telefono: paciente.telefono ?? undefined,
      paciente_email: paciente.email ?? undefined,
      servicio_nombre: servicio.nombre,
      profesional_nombre: profesional.nombre,
      fecha,
      hora,
      hora_fin: horaFin,
      clinica_nombre: clinica.nombre,
      clinica_logo_url: clinica.logo_url ?? undefined,
      clinica_telefono: clinica.telefono ?? undefined,
      clinica_email: clinica.email ?? undefined,
      clinica_direccion: clinica.direccion ?? undefined,
      canal,
    }

    // 1. Email al paciente
    if (paciente.email) {
      promesas.push(
        fetch(`${base}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'cancelacion_cita', destinatario: paciente.email, datos: cancelDatos }),
        }).catch((err) => console.error('[notificar-cita] cancelacion paciente error:', err)),
      )
    }

    // 2. Notificar a la clínica (admin)
    const adminEmail = email_admin ?? clinica.email
    if (adminEmail) {
      promesas.push(
        fetch(`${base}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'cancelacion_admin',
            destinatario: adminEmail,
            datos: cancelDatos,
          }),
        }).catch((err) => console.error('[notificar-cita] cancelacion admin error:', err)),
      )
    }
  }

  await Promise.allSettled(promesas)
  return NextResponse.json({ ok: true })
}
