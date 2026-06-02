import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type CitaRow = {
  id: string
  inicio: string
  fin: string | null
  pacientes: { nombre: string; email: string | null; telefono: string | null } | null
  profesionales: { nombre: string } | null
  servicios: { nombre: string } | null
  clinicas: { nombre: string; telefono: string | null; email: string | null; direccion: string | null; logo_url: string | null } | null
}

function formatCitaParaEmail(cita: CitaRow) {
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
  return { hora, horaFin, fecha }
}

async function sendEmailApi(base: string, tipo: string, destinatario: string, datos: Record<string, unknown>) {
  return fetch(`${base}/api/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, destinatario, datos }),
  }).catch((err) => console.error(`[cron/email-recordatorios] ${tipo} error:`, err))
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpliclinic.vercel.app'
  const now = new Date()
  let enviados = 0

  const commonSelect = `
    id, inicio, fin,
    pacientes(nombre, email, telefono),
    profesionales(nombre),
    servicios(nombre),
    clinicas(nombre, telefono, email, direccion, logo_url)
  `

  // ── 1. Recordatorio día anterior ─────────────────────────────────────────────
  const manana = new Date(now)
  manana.setUTCDate(now.getUTCDate() + 1)
  const mananaStr = manana.toISOString().slice(0, 10)

  const { data: citasManana } = await supabase
    .from('citas')
    .select(commonSelect)
    .gte('inicio', `${mananaStr}T00:00:00`)
    .lt('inicio', `${mananaStr}T23:59:59`)
    .in('estado', ['pendiente', 'confirmada'])

  for (const cita of (citasManana ?? []) as unknown as CitaRow[]) {
    const paciente = cita.pacientes
    if (!paciente?.email) continue
    const clinica = cita.clinicas
    const { hora, horaFin, fecha } = formatCitaParaEmail(cita)
    await sendEmailApi(base, 'recordatorio_cita', paciente.email, {
      paciente_nombre: paciente.nombre,
      paciente_telefono: paciente.telefono ?? undefined,
      servicio_nombre: cita.servicios?.nombre ?? '',
      profesional_nombre: cita.profesionales?.nombre ?? '',
      fecha,
      hora,
      hora_fin: horaFin,
      clinica_nombre: clinica?.nombre ?? '',
      clinica_logo_url: clinica?.logo_url ?? undefined,
      clinica_telefono: clinica?.telefono ?? undefined,
      clinica_email: clinica?.email ?? undefined,
      clinica_direccion: clinica?.direccion ?? undefined,
    })
    enviados++
  }

  // ── 2. Recordatorio mismo día (mañana 8–10 AM local, cron corre a las 7 UTC) ──
  const hoyStr = now.toISOString().slice(0, 10)

  const { data: citasHoy } = await supabase
    .from('citas')
    .select(commonSelect)
    .gte('inicio', `${hoyStr}T10:00:00`)
    .lt('inicio', `${hoyStr}T23:59:59`)
    .in('estado', ['pendiente', 'confirmada'])

  for (const cita of (citasHoy ?? []) as unknown as CitaRow[]) {
    const paciente = cita.pacientes
    if (!paciente?.email) continue
    const clinica = cita.clinicas
    const { hora, horaFin, fecha } = formatCitaParaEmail(cita)
    await sendEmailApi(base, 'recordatorio_cita', paciente.email, {
      paciente_nombre: paciente.nombre,
      paciente_telefono: paciente.telefono ?? undefined,
      servicio_nombre: cita.servicios?.nombre ?? '',
      profesional_nombre: cita.profesionales?.nombre ?? '',
      fecha,
      hora,
      hora_fin: horaFin,
      clinica_nombre: clinica?.nombre ?? '',
      clinica_logo_url: clinica?.logo_url ?? undefined,
      clinica_telefono: clinica?.telefono ?? undefined,
      clinica_email: clinica?.email ?? undefined,
      clinica_direccion: clinica?.direccion ?? undefined,
    })
    enviados++
  }

  // ── 3. Post-cita (completadas hace 1–3 horas) ──────────────────────────────────
  const postDesde = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const postHasta = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()

  const { data: citasPost } = await supabase
    .from('citas')
    .select(commonSelect)
    .eq('estado', 'completada')
    .gte('fin', postDesde)
    .lte('fin', postHasta)

  for (const cita of (citasPost ?? []) as unknown as CitaRow[]) {
    const paciente = cita.pacientes
    if (!paciente?.email) continue
    const clinica = cita.clinicas
    const { hora, horaFin, fecha } = formatCitaParaEmail(cita)
    await sendEmailApi(base, 'post_cita', paciente.email, {
      paciente_nombre: paciente.nombre,
      paciente_telefono: paciente.telefono ?? undefined,
      servicio_nombre: cita.servicios?.nombre ?? '',
      profesional_nombre: cita.profesionales?.nombre ?? '',
      fecha,
      hora,
      hora_fin: horaFin,
      clinica_nombre: clinica?.nombre ?? '',
      clinica_logo_url: clinica?.logo_url ?? undefined,
      clinica_telefono: clinica?.telefono ?? undefined,
      clinica_email: clinica?.email ?? undefined,
      clinica_direccion: clinica?.direccion ?? undefined,
    })
    enviados++
  }

  return NextResponse.json({ ok: true, enviados })
}
