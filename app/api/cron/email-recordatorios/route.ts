import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { RECORDATORIOS_EMAIL_DEFAULT, type RecordatoriosEmailConfig } from '@/lib/onboarding/queries'

export const runtime = 'nodejs'

function getChileOffsetMs(): number {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    hour: 'numeric', hourCycle: 'h23'
  }).formatToParts(now)
  const localHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  const utcHour = now.getUTCHours()
  const diff = ((localHour - utcHour + 36) % 24) - 12 // handle day boundary
  return -diff * 60 * 60 * 1000
}

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
    configuracion: Record<string, unknown> | null
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
  const p = cita.pacientes
  const c = cita.clinicas
  if (!p?.email) return null
  return {
    tipo,
    destinatario: p.email,
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
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
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
    clinicas(id, nombre, telefono, email, direccion, logo_url, configuracion)
  `

  function emailConfig(cita: CitaRow): RecordatoriosEmailConfig {
    const cfg = cita.clinicas?.configuracion
    return (cfg?.recordatorios_email as RecordatoriosEmailConfig) ?? RECORDATORIOS_EMAIL_DEFAULT
  }

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

  // Batch fetch already-sent logs to avoid N+1 queries
  async function batchYaEnviados(citaIds: string[], tipo: TipoEmailLog): Promise<Set<string>> {
    if (citaIds.length === 0) return new Set()
    const { data } = await supabase
      .from('whatsapp_logs')
      .select('cita_id')
      .in('cita_id', citaIds)
      .eq('tipo_mensaje', tipo)
    return new Set((data ?? []).map((r: { cita_id: string }) => r.cita_id))
  }

  const rowsManana = (citasManana ?? []) as unknown as CitaRow[]
  const sentManana = await batchYaEnviados(rowsManana.map(c => c.id), 'email_recordatorio_manana')

  for (const cita of rowsManana) {
    if (!cita.pacientes?.email) continue
    if (!cita.clinicas?.id) continue
    if (!emailConfig(cita).manana) { stats.omitidos++; continue }

    if (sentManana.has(cita.id)) {
      stats.omitidos++
      continue
    }

    const built = buildDatos(cita, 'recordatorio_cita')
    if (!built) { stats.omitidos++; continue }
    const { tipo, destinatario, datos } = built
    const ok = await sendEmail(base, tipo, destinatario, datos)
    if (ok) {
      await registrarEnvio(supabase, cita.id, cita.clinicas.id, 'email_recordatorio_manana', destinatario)
      stats.recordatorio_manana++
    } else {
      stats.errores++
    }
  }

  // ── 2. Recordatorio mismo día ─────────────────────────────────────────────────
  // inicio está guardado como wall-clock (hora local de Chile, no UTC).
  // Usamos el offset real de Santiago para no asumir un valor fijo.
  const CHILE_OFFSET_MS = getChileOffsetMs()
  const nowChile = new Date(now.getTime() - CHILE_OFFSET_MS)
  const windowFrom = new Date(nowChile.getTime() + 0.5 * 60 * 60 * 1000).toISOString().slice(0, 19)
  const windowTo   = new Date(nowChile.getTime() + 3.5 * 60 * 60 * 1000).toISOString().slice(0, 19)

  const { data: citasHoy } = await supabase
    .from('citas')
    .select(commonSelect)
    .gte('inicio', windowFrom)
    .lte('inicio', windowTo)
    .in('estado', ['pendiente', 'confirmada'])

  const rowsHoy = (citasHoy ?? []) as unknown as CitaRow[]
  const sentHoy = await batchYaEnviados(rowsHoy.map(c => c.id), 'email_recordatorio_hoy')

  for (const cita of rowsHoy) {
    if (!cita.pacientes?.email) continue
    if (!cita.clinicas?.id) continue

    const cfg = emailConfig(cita)
    if (!cfg.hoy) { stats.omitidos++; continue }

    // Check if this cita falls within ±30min of the configured horas_antes window
    const horasAntes = cfg.hoy_horas_antes ?? 2
    const citaWall = new Date(cita.inicio.slice(0, 19))
    const targetWall = new Date(nowChile.getTime() + horasAntes * 60 * 60 * 1000)
    const diffMin = Math.abs(citaWall.getTime() - targetWall.getTime()) / 60000
    if (diffMin > 30) { stats.omitidos++; continue }

    if (sentHoy.has(cita.id)) {
      stats.omitidos++
      continue
    }

    const builtHoy = buildDatos(cita, 'recordatorio_cita')
    if (!builtHoy) { stats.omitidos++; continue }
    const { tipo, destinatario, datos } = builtHoy
    const ok = await sendEmail(base, tipo, destinatario, datos)
    if (ok) {
      await registrarEnvio(supabase, cita.id, cita.clinicas.id, 'email_recordatorio_hoy', destinatario)
      stats.recordatorio_hoy++
    } else {
      stats.errores++
    }
  }

  // ── 3. Post-cita (fin entre 1h y 3h atrás, hora chilena) ─────────────────────
  const postDesde = new Date(nowChile.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19)
  const postHasta = new Date(nowChile.getTime() - 1 * 60 * 60 * 1000).toISOString().slice(0, 19)

  const { data: citasPost } = await supabase
    .from('citas')
    .select(commonSelect)
    .eq('estado', 'completada')
    .gte('fin', postDesde)
    .lte('fin', postHasta)

  const rowsPost = (citasPost ?? []) as unknown as CitaRow[]
  const sentPost = await batchYaEnviados(rowsPost.map(c => c.id), 'email_post_cita')

  for (const cita of rowsPost) {
    if (!cita.pacientes?.email) continue
    if (!cita.clinicas?.id) continue
    if (!emailConfig(cita).post_cita) { stats.omitidos++; continue }

    if (sentPost.has(cita.id)) {
      stats.omitidos++
      continue
    }

    const builtPost = buildDatos(cita, 'post_cita')
    if (!builtPost) { stats.omitidos++; continue }
    const { tipo, destinatario, datos } = builtPost
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
