import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type CitaRow = {
  id: string
  inicio: string
  fin: string | null
  pacientes: { nombre: string; email: string | null; telefono: string | null } | null
  profesionales: { nombre: string } | null
  servicios: { nombre: string } | null
  clinicas: {
    id: string
    nombre: string
    telefono: string | null
    email: string | null
    direccion: string | null
    logo_url: string | null
  } | null
}

type TipoEmailLog =
  | 'email_recordatorio_manana'
  | 'email_recordatorio_hoy'
  | 'email_post_cita'

function formatCita(cita: CitaRow) {
  const hora = cita.inicio.slice(11, 16)
  const horaFin = cita.fin ? cita.fin.slice(11, 16) : undefined
  const fechaDate = new Date(cita.inicio.slice(0, 10) + 'T12:00:00Z')
  const fecha = fechaDate.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return { hora, horaFin, fecha }
}

async function yaEnviado(
  supabase: ReturnType<typeof createAdminClient>,
  citaId: string,
  tipo: TipoEmailLog,
): Promise<boolean> {
  const { data } = await supabase
    .from('whatsapp_logs')
    .select('id')
    .eq('cita_id', citaId)
    .eq('tipo_mensaje', tipo)
    .maybeSingle()
  return !!data
}

async function registrarEnvio(
  supabase: ReturnType<typeof createAdminClient>,
  citaId: string,
  clinicaId: string,
  tipo: TipoEmailLog,
  email: string,
) {
  await supabase.from('whatsapp_logs').insert({
    cita_id: citaId,
    clinica_id: clinicaId,
    tipo_mensaje: tipo,
    estado: 'enviado',
    paciente_telefono: email, // reusing column to store email
  })
}

async function sendEmail(
  base: string,
  tipo: string,
  destinatario: string,
  datos: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(`${base}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, destinatario, datos }),
    })
    const json = await res.json() as { ok: boolean }
    return json.ok === true
  } catch (err) {
    console.error(`[email-recordatorios] ${tipo} error:`, err)
    return false
  }
}

function buildDatos(cita: CitaRow, tipo: string) {
  const { hora, horaFin, fecha } = formatCita(cita)
  const p = cita.pacientes!
  const c = cita.clinicas
  return {
    tipo,
    destinatario: p.email!,
    datos: {
      paciente_nombre: p.nombre,
      paciente_telefono: p.telefono ?? undefined,
      servicio_nombre: cita.servicios?.nombre ?? '',
      profesional_nombre: cita.profesionales?.nombre ?? '',
      fecha,
      hora,
      hora_fin: horaFin,
      clinica_nombre: c?.nombre ?? '',
      clinica_logo_url: c?.logo_url ?? undefined,
      clinica_telefono: c?.telefono ?? undefined,
      clinica_email: c?.email ?? undefined,
      clinica_direccion: c?.direccion ?? undefined,
    },
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
  const now = new Date()
  const stats = { recordatorio_manana: 0, recordatorio_hoy: 0, post_cita: 0, omitidos: 0, errores: 0 }

  const commonSelect = `
    id, inicio, fin,
    pacientes(nombre, email, telefono),
    profesionales(nombre),
    servicios(nombre),
    clinicas(id, nombre, telefono, email, direccion, logo_url)
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
    if (!cita.pacientes?.email) continue
    if (!cita.clinicas?.id) continue

    if (await yaEnviado(supabase, cita.id, 'email_recordatorio_manana')) {
      stats.omitidos++
      continue
    }

    const { tipo, destinatario, datos } = buildDatos(cita, 'recordatorio_cita')
    const ok = await sendEmail(base, tipo, destinatario, datos)
    if (ok) {
      await registrarEnvio(supabase, cita.id, cita.clinicas.id, 'email_recordatorio_manana', destinatario)
      stats.recordatorio_manana++
    } else {
      stats.errores++
    }
  }

  // ── 2. Recordatorio mismo día ─────────────────────────────────────────────────
  const hoyStr = now.toISOString().slice(0, 10)

  const { data: citasHoy } = await supabase
    .from('citas')
    .select(commonSelect)
    .gte('inicio', `${hoyStr}T10:00:00`)
    .lt('inicio', `${hoyStr}T23:59:59`)
    .in('estado', ['pendiente', 'confirmada'])

  for (const cita of (citasHoy ?? []) as unknown as CitaRow[]) {
    if (!cita.pacientes?.email) continue
    if (!cita.clinicas?.id) continue

    if (await yaEnviado(supabase, cita.id, 'email_recordatorio_hoy')) {
      stats.omitidos++
      continue
    }

    const { tipo, destinatario, datos } = buildDatos(cita, 'recordatorio_cita')
    const ok = await sendEmail(base, tipo, destinatario, datos)
    if (ok) {
      await registrarEnvio(supabase, cita.id, cita.clinicas.id, 'email_recordatorio_hoy', destinatario)
      stats.recordatorio_hoy++
    } else {
      stats.errores++
    }
  }

  // ── 3. Post-cita (completadas hace 1–3 horas) ─────────────────────────────────
  const postDesde = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const postHasta = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()

  const { data: citasPost } = await supabase
    .from('citas')
    .select(commonSelect)
    .eq('estado', 'completada')
    .gte('fin', postDesde)
    .lte('fin', postHasta)

  for (const cita of (citasPost ?? []) as unknown as CitaRow[]) {
    if (!cita.pacientes?.email) continue
    if (!cita.clinicas?.id) continue

    if (await yaEnviado(supabase, cita.id, 'email_post_cita')) {
      stats.omitidos++
      continue
    }

    const { tipo, destinatario, datos } = buildDatos(cita, 'post_cita')
    const ok = await sendEmail(base, tipo, destinatario, datos)
    if (ok) {
      await registrarEnvio(supabase, cita.id, cita.clinicas.id, 'email_post_cita', destinatario)
      stats.post_cita++
    } else {
      stats.errores++
    }
  }

  if (stats.errores > 0) {
    Sentry.captureException(
      new Error(`[cron/email-recordatorios] ${stats.errores} emails fallaron`),
      { tags: { cron: 'email-recordatorios' }, extra: stats },
    )
  }
  console.log('[email-recordatorios]', stats)
  return NextResponse.json({ ok: true, ...stats })
}
