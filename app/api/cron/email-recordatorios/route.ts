import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Verify the request comes from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Calculate tomorrow's date range (wall-clock UTC)
  const hoy = new Date()
  const manana = new Date(hoy)
  manana.setUTCDate(hoy.getUTCDate() + 1)
  const mananaStr = manana.toISOString().slice(0, 10) // "YYYY-MM-DD"

  const { data: citas, error } = await supabase
    .from('citas')
    .select(`
      id, inicio, fin,
      pacientes(nombre, email, telefono),
      profesionales(nombre),
      servicios(nombre),
      clinicas(nombre, telefono, email, direccion)
    `)
    .gte('inicio', `${mananaStr}T00:00:00`)
    .lt('inicio', `${mananaStr}T23:59:59`)
    .in('estado', ['pendiente', 'confirmada'])

  if (error) {
    console.error('[cron/email-recordatorios] Supabase error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (!citas || citas.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpliclinic.vercel.app'
  let enviados = 0

  for (const cita of citas) {
    const paciente = cita.pacientes as unknown as { nombre: string; email: string | null; telefono: string | null } | null
    if (!paciente?.email) continue

    const profesional = cita.profesionales as unknown as { nombre: string } | null
    const servicio = cita.servicios as unknown as { nombre: string } | null
    const clinica = cita.clinicas as unknown as {
      nombre: string
      telefono: string | null
      email: string | null
      direccion: string | null
    } | null

    // inicio is wall-clock UTC — extract time directly from ISO string
    const inicioStr = new Date(cita.inicio).toISOString()
    const finStr = cita.fin ? new Date(cita.fin).toISOString() : null
    const hora = inicioStr.slice(11, 16)
    const horaFin = finStr ? finStr.slice(11, 16) : undefined
    const fechaDate = new Date(inicioStr.slice(0, 10) + 'T12:00:00Z')
    const fecha = fechaDate.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })

    await fetch(`${base}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'recordatorio_cita',
        destinatario: paciente.email,
        datos: {
          paciente_nombre: paciente.nombre,
          paciente_telefono: paciente.telefono ?? undefined,
          servicio_nombre: servicio?.nombre ?? '',
          profesional_nombre: profesional?.nombre ?? '',
          fecha,
          hora,
          hora_fin: horaFin,
          clinica_nombre: clinica?.nombre ?? '',
          clinica_telefono: clinica?.telefono ?? undefined,
          clinica_email: clinica?.email ?? undefined,
          clinica_direccion: clinica?.direccion ?? undefined,
        },
      }),
    }).catch((err) => {
      console.error('[cron/email-recordatorios] Error sending email for cita', cita.id, err)
    })

    enviados++
  }

  return NextResponse.json({ ok: true, enviados })
}
