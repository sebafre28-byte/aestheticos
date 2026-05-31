import { createHmac, timingSafeEqual } from 'node:crypto'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  CLINIC_TIMEZONE,
  citaInicioToUtcMs,
  storedInicioOffsetMs,
} from '@/lib/agenda/datetime'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  clinicPhoneToWhatsApp,
  getWhatsappProvider,
  toWhatsAppE164,
} from '@/lib/whatsapp/provider'
import * as templates from '@/lib/whatsapp/templates'

export const WHATSAPP_QUEUE_NAME = 'whatsapp-reminders'

export type WhatsappLogTipo =
  | 'recordatorio_24h'
  | 'recordatorio_2h'
  | 'confirmacion'
  | 'post_cita'
  | 'notificacion_clinica_cancelacion'
  | 'manual'

export type WhatsappJobData = {
  clinicaId: string
  citaId: string
  tipoMensaje: WhatsappLogTipo
}

const MS_PER_HOUR = 60 * 60 * 1000

export { CLINIC_TIMEZONE, citaInicioToUtcMs, storedInicioOffsetMs }

/** Ventana UTC en milisegundos (independiente de TZ del runtime). */
export function utcWindowFromNow(
  hoursFromNowMin: number,
  hoursFromNowMax: number,
  nowMs: number = Date.now(),
): { desde: Date; hasta: Date; desdeUtc: string; hastaUtc: string; nowUtc: string } {
  const now = new Date(nowMs)
  const desde = new Date(nowMs + hoursFromNowMin * MS_PER_HOUR)
  const hasta = new Date(nowMs + hoursFromNowMax * MS_PER_HOUR)
  return {
    desde,
    hasta,
    nowUtc: now.toISOString(),
    desdeUtc: desde.toISOString(),
    hastaUtc: hasta.toISOString(),
  }
}

export function hoursUntilInicioUtc(
  inicioIso: string,
  nowMs: number = Date.now(),
  timeZone: string = CLINIC_TIMEZONE,
): number {
  return (citaInicioToUtcMs(inicioIso, timeZone) - nowMs) / MS_PER_HOUR
}

/** Límites ISO para filtrar `inicio` en BD (naive local) + ventana UTC real para debug. */
export function reminderQueryBounds(
  hoursFromNowMin: number,
  hoursFromNowMax: number,
  nowMs: number = Date.now(),
  timeZone: string = CLINIC_TIMEZONE,
  queryPaddingHours = 2,
): {
  trueWindow: ReturnType<typeof utcWindowFromNow>
  queryDesdeUtc: string
  queryHastaUtc: string
  offsetMsAtMid: number
} {
  const trueWindow = utcWindowFromNow(hoursFromNowMin, hoursFromNowMax, nowMs)
  const midMs = nowMs + ((hoursFromNowMin + hoursFromNowMax) / 2) * MS_PER_HOUR
  const offsetMs = storedInicioOffsetMs(midMs, timeZone)

  const queryDesde = new Date(trueWindow.desde.getTime() - offsetMs - queryPaddingHours * MS_PER_HOUR)
  const queryHasta = new Date(trueWindow.hasta.getTime() - offsetMs + queryPaddingHours * MS_PER_HOUR)

  return {
    trueWindow,
    queryDesdeUtc: queryDesde.toISOString(),
    queryHastaUtc: queryHasta.toISOString(),
    offsetMsAtMid: offsetMs,
  }
}

export function citaEnVentanaHoras(
  inicioIso: string,
  hoursMin: number,
  hoursMax: number,
  nowMs: number = Date.now(),
  timeZone: string = CLINIC_TIMEZONE,
): boolean {
  const h = hoursUntilInicioUtc(inicioIso, nowMs, timeZone)
  return h >= hoursMin && h <= hoursMax
}

type CitaCronRow = {
  id: string
  clinica_id: string
  inicio: string
  pacientes: { telefono: string | null } | { telefono: string | null }[] | null
}

function normalizePacienteTelefono(
  pacientes: CitaCronRow['pacientes'],
): string | null {
  if (!pacientes) return null
  const row = Array.isArray(pacientes) ? pacientes[0] : pacientes
  return row?.telefono ?? null
}

export type CronRecordatoriosDebug = {
  nowUtc: string
  /** Referencia: ahora + 24 h en UTC (instante objetivo del recordatorio 24 h). */
  nowPlus24hUtc: string
  clinicTimezone: string
  ventanas: Array<{
    tipo: WhatsappLogTipo
    /** Ventana real en UTC (horas hasta inicio corregidas por America/Santiago). */
    trueDesdeUtc: string
    trueHastaUtc: string
    /** Límites usados en `.gte/.lte('inicio', …)` sobre valores guardados en BD. */
    queryDesdeUtc: string
    queryHastaUtc: string
    offsetMsAtMid: number
    horasMin: number
    horasMax: number
    encontradasQuery: number
    encontradasEnVentana: number
    muestras: Array<{
      citaId: string
      inicioUtc: string
      horasHastaInicio: number
      telefono: string | null
    }>
  }>
  postCita?: {
    trueDesdeUtc: string
    trueHastaUtc: string
    queryDesdeUtc: string
    queryHastaUtc: string
    encontradasQuery: number
    encontradas: number
  }
  envioDetalle: Array<{ citaId: string; tipo: WhatsappLogTipo; status: string; reason?: string }>
}

type CitaWhatsAppRow = {
  id: string
  clinica_id: string
  inicio: string
  fin: string
  estado: string
  pacientes: { nombre: string; telefono: string | null } | null
  profesionales: { nombre: string } | null
  servicios: { nombre: string } | null
  clinicas: { nombre: string } | null
}

let redisConn: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('[whatsapp] REDIS_URL no configurada — recordatorios operan solo vía cron horario. Jobs BullMQ deshabilitados.')
    return null
  }
  if (!redisConn) {
    redisConn = new Redis(url, { maxRetriesPerRequest: null })
  }
  return redisConn
}

export function getWhatsappQueue(): Queue<WhatsappJobData> | null {
  const conn = getRedis()
  if (!conn) return null
  return new Queue<WhatsappJobData>(WHATSAPP_QUEUE_NAME, { connection: conn })
}

export function createWhatsappWorker(
  processor: (job: Job<WhatsappJobData>) => Promise<void>,
): Worker<WhatsappJobData> | null {
  const conn = getRedis()
  if (!conn) return null
  return new Worker<WhatsappJobData>(WHATSAPP_QUEUE_NAME, processor, { connection: conn })
}

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function parsePatientResponse(body: string): 'si' | 'no' | null {
  const t = body.trim().toLowerCase()
  if (!t) return null
  const norm = t.normalize('NFD').replace(/\p{M}/gu, '')
  if (/^(si|sí|ok|listo|confirmo|confirmar|dale|1)$/.test(norm)) return 'si'
  if (/^(no|nop|cancelo|cancelar|2)$/.test(norm)) return 'no'
  return null
}

export function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  fullUrl: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false
  const keys = Object.keys(params).sort()
  let acc = fullUrl
  for (const k of keys) acc += k + params[k]
  const expected = createHmac('sha1', authToken).update(acc, 'utf8').digest('base64')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

function ctxFromCita(row: CitaWhatsAppRow): templates.RecordatorioContext {
  const inicio = new Date(row.inicio)
  return {
    pacienteNombre: row.pacientes?.nombre ?? 'Paciente',
    clinicaNombre: row.clinicas?.nombre ?? 'la clínica',
    servicioNombre: row.servicios?.nombre ?? 'consulta',
    profesionalNombre: row.profesionales?.nombre ?? 'su profesional',
    inicioLegible: format(inicio, "EEEE d 'de' MMMM HH:mm", { locale: es }),
  }
}

function bodyForTipo(row: CitaWhatsAppRow, tipo: WhatsappLogTipo): string | null {
  const ctx = ctxFromCita(row)
  switch (tipo) {
    case 'recordatorio_24h':
      return templates.plantillaRecordatorio24h(ctx)
    case 'recordatorio_2h':
      return templates.plantillaRecordatorio2h(ctx)
    case 'confirmacion':
    case 'manual':
      return templates.plantillaConfirmacionManual(ctx)
    case 'post_cita':
      return templates.plantillaPostCita(ctx)
    default:
      return null
  }
}

async function alreadySent(
  supabase: SupabaseClient,
  citaId: string,
  tipo: WhatsappLogTipo,
): Promise<boolean> {
  const { data } = await supabase
    .from('whatsapp_logs')
    .select('id')
    .eq('cita_id', citaId)
    .eq('tipo_mensaje', tipo)
    .eq('estado', 'enviado')
    .maybeSingle()
  return !!data
}

async function fetchCitaForWhatsApp(
  supabase: SupabaseClient,
  citaId: string,
): Promise<CitaWhatsAppRow | null> {
  const { data, error } = await supabase
    .from('citas')
    .select(
      `id, clinica_id, inicio, fin, estado,
       pacientes ( nombre, telefono ),
       profesionales ( nombre ),
       servicios ( nombre ),
       clinicas ( nombre )`,
    )
    .eq('id', citaId)
    .maybeSingle()

  if (error || !data) return null
  const d = data as unknown as {
    pacientes: CitaWhatsAppRow['pacientes'] | CitaWhatsAppRow['pacientes'][] | null
    profesionales: CitaWhatsAppRow['profesionales'] | CitaWhatsAppRow['profesionales'][] | null
    servicios: CitaWhatsAppRow['servicios'] | CitaWhatsAppRow['servicios'][] | null
    clinicas: CitaWhatsAppRow['clinicas'] | CitaWhatsAppRow['clinicas'][] | null
    id: string
    clinica_id: string
    inicio: string
    fin: string
    estado: string
  }
  const one = <T>(x: T | T[] | null | undefined): T | null =>
    x == null ? null : Array.isArray(x) ? (x[0] ?? null) : x
  return {
    id: d.id,
    clinica_id: d.clinica_id,
    inicio: d.inicio,
    fin: d.fin,
    estado: d.estado,
    pacientes: one(d.pacientes),
    profesionales: one(d.profesionales),
    servicios: one(d.servicios),
    clinicas: one(d.clinicas),
  }
}

export type SendReminderResult =
  | { status: 'enviado' }
  | { status: 'fallido'; error: string }
  | { status: 'omitido'; reason: string }

/**
 * Envía un recordatorio y escribe whatsapp_logs. No modifica la cita.
 * Errores de red/Twilio no propagan excepción a la capa de agenda.
 */
export async function sendWhatsappReminderInternal(
  supabase: SupabaseClient,
  input: { clinicaId: string; citaId: string; tipoMensaje: WhatsappLogTipo },
): Promise<SendReminderResult> {
  const { clinicaId, citaId, tipoMensaje } = input

  if (tipoMensaje === 'notificacion_clinica_cancelacion') {
    return { status: 'omitido', reason: 'tipo interno' }
  }

  const row = await fetchCitaForWhatsApp(supabase, citaId)
  if (!row) return { status: 'omitido', reason: 'cita no encontrada' }
  if (row.clinica_id !== clinicaId) return { status: 'omitido', reason: 'clínica no coincide' }

  if (['cancelada', 'no_asistio'].includes(row.estado)) {
    return { status: 'omitido', reason: `cita ${row.estado}` }
  }

  if (tipoMensaje === 'post_cita' && row.estado !== 'completada') {
    return { status: 'omitido', reason: 'post_cita solo para citas completadas' }
  }

  if (['recordatorio_24h', 'recordatorio_2h', 'post_cita'].includes(tipoMensaje)) {
    if (await alreadySent(supabase, citaId, tipoMensaje)) {
      return { status: 'omitido', reason: 'ya enviado' }
    }
  }

  const rawPhone = row.pacientes?.telefono
  if (!rawPhone) {
    console.log('[whatsapp] paciente sin telefono', { citaId, tipoMensaje, paciente: row.pacientes })
  }
  const to = toWhatsAppE164(rawPhone ?? '')
  if (!to) {
    await supabase.from('whatsapp_logs').insert({
      clinica_id: clinicaId,
      cita_id: citaId,
      paciente_telefono: rawPhone ?? '',
      tipo_mensaje: tipoMensaje,
      estado: 'fallido',
      respuesta_paciente: 'Teléfono del paciente inválido o vacío',
    })
    return { status: 'fallido', error: 'Teléfono del paciente inválido o vacío' }
  }

  const body = bodyForTipo(row, tipoMensaje)
  if (!body) return { status: 'omitido', reason: 'sin plantilla' }

  const provider = getWhatsappProvider()
  const result = await provider.sendWhatsApp({ to, body })

  const logRow = {
    clinica_id: clinicaId,
    cita_id: citaId,
    paciente_telefono: to,
    tipo_mensaje: tipoMensaje,
    estado: result.ok ? ('enviado' as const) : ('fallido' as const),
    respuesta_paciente: result.ok ? null : (result.error ?? 'error').slice(0, 500),
  }

  const { error: insErr } = await supabase.from('whatsapp_logs').insert(logRow)
  if (insErr?.code === '23505' && result.ok) {
    return { status: 'omitido', reason: 'duplicado concurrente' }
  }
  if (insErr && result.ok) {
    console.error('[whatsapp] insert log tras envío OK', insErr)
    return {
      status: 'fallido',
      error: 'Envío entregado al proveedor pero falló el registro en whatsapp_logs',
    }
  }
  if (insErr) {
    console.error('[whatsapp] insert log', insErr)
  }

  if (!result.ok) {
    return { status: 'fallido', error: result.error ?? 'Envío rechazado' }
  }
  return { status: 'enviado' }
}

export async function processWhatsappJob(job: Job<WhatsappJobData>): Promise<void> {
  const supabase = createAdminClient()
  await sendWhatsappReminderInternal(supabase, job.data)
}

/**
 * Programa jobs diferidos (24h, 2h y post-cita) en BullMQ si hay REDIS_URL.
 * Idempotente por jobId fijo por cita + tipo.
 */
/**
 * Cancela los jobs pendientes de BullMQ para una cita (al editar hora o cancelar).
 * No lanza excepción si Redis no está disponible.
 */
export async function cancelWhatsappJobsForCita(citaId: string): Promise<void> {
  const queue = getWhatsappQueue()
  if (!queue) return

  const jobIds = [`${citaId}-r24`, `${citaId}-r2`, `${citaId}-post`]
  await Promise.allSettled(
    jobIds.map(async (jobId) => {
      const job = await queue.getJob(jobId)
      if (job) await job.remove()
    }),
  )
}

export async function scheduleWhatsappJobsForCitaId(citaId: string): Promise<{
  ok: boolean
  detail: string
}> {
  const queue = getWhatsappQueue()
  if (!queue) return { ok: false, detail: 'REDIS_URL no configurada; use el cron horario.' }

  let supabase
  try {
    supabase = createAdminClient()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, detail: msg }
  }

  const row = await fetchCitaForWhatsApp(supabase, citaId)
  if (!row) return { ok: false, detail: 'cita no encontrada' }

  const now = Date.now()
  const inicio = new Date(row.inicio).getTime()
  const fin = new Date(row.fin).getTime()

  const jobs: { tipo: WhatsappLogTipo; delay: number; jobId: string }[] = []

  const d24 = inicio - 24 * 60 * 60 * 1000 - now
  if (d24 > 0) jobs.push({ tipo: 'recordatorio_24h', delay: d24, jobId: `${citaId}-r24` })

  const d2 = inicio - 2 * 60 * 60 * 1000 - now
  if (d2 > 0) jobs.push({ tipo: 'recordatorio_2h', delay: d2, jobId: `${citaId}-r2` })

  const dPost = fin + 2 * 60 * 60 * 1000 - now
  if (dPost > 0) jobs.push({ tipo: 'post_cita', delay: dPost, jobId: `${citaId}-post` })

  for (const j of jobs) {
    await queue.add(
      'send',
      { clinicaId: row.clinica_id, citaId: row.id, tipoMensaje: j.tipo },
      { delay: j.delay, jobId: j.jobId, removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
    )
  }

  return { ok: true, detail: `${jobs.length} jobs programados` }
}

export async function runHourlyRecordatorios(): Promise<{
  enviados: number
  fallidos: number
  omitidos: number
  errores: string[]
  debug: CronRecordatoriosDebug
}> {
  const out: {
    enviados: number
    fallidos: number
    omitidos: number
    errores: string[]
    debug: CronRecordatoriosDebug
  } = {
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
    errores: [],
    debug: {
      nowUtc: new Date().toISOString(),
      nowPlus24hUtc: new Date(Date.now() + 24 * MS_PER_HOUR).toISOString(),
      clinicTimezone: CLINIC_TIMEZONE,
      ventanas: [],
      envioDetalle: [],
    },
  }

  let supabase: SupabaseClient
  try {
    supabase = createAdminClient()
  } catch (e) {
    out.errores.push(e instanceof Error ? e.message : String(e))
    return out
  }

  const nowMs = Date.now()
  out.debug.nowUtc = new Date(nowMs).toISOString()
  out.debug.nowPlus24hUtc = new Date(nowMs + 24 * MS_PER_HOUR).toISOString()
  out.debug.clinicTimezone = CLINIC_TIMEZONE

  // Ventana real en UTC; 22–26 h / 0.5–3.5 h toleran cron horario. Query en BD compensa inicio guardado sin offset.
  const ventanasConfig: { tipo: WhatsappLogTipo; horasMin: number; horasMax: number }[] = [
    { tipo: 'recordatorio_24h', horasMin: 22, horasMax: 26 },
    { tipo: 'recordatorio_2h', horasMin: 0.5, horasMax: 3.5 },
  ]

  console.log('[cron/recordatorios] inicio', {
    nowUtc: out.debug.nowUtc,
    nowPlus24hUtc: out.debug.nowPlus24hUtc,
    clinicTimezone: CLINIC_TIMEZONE,
    tzRuntime: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  for (const cfg of ventanasConfig) {
    const bounds = reminderQueryBounds(cfg.horasMin, cfg.horasMax, nowMs)

    const { data: citas, error } = await supabase
      .from('citas')
      .select('id, clinica_id, inicio, pacientes ( telefono )')
      .in('estado', ['pendiente', 'confirmada'])
      .gte('inicio', bounds.queryDesdeUtc)
      .lte('inicio', bounds.queryHastaUtc)

    const queryRows = (citas ?? []) as CitaCronRow[]
    const rows = queryRows.filter((c) =>
      citaEnVentanaHoras(c.inicio, cfg.horasMin, cfg.horasMax, nowMs),
    )

    const ventanaDebug = {
      tipo: cfg.tipo,
      trueDesdeUtc: bounds.trueWindow.desdeUtc,
      trueHastaUtc: bounds.trueWindow.hastaUtc,
      queryDesdeUtc: bounds.queryDesdeUtc,
      queryHastaUtc: bounds.queryHastaUtc,
      offsetMsAtMid: bounds.offsetMsAtMid,
      horasMin: cfg.horasMin,
      horasMax: cfg.horasMax,
      encontradasQuery: queryRows.length,
      encontradasEnVentana: rows.length,
      muestras: rows.slice(0, 8).map((c) => ({
        citaId: c.id,
        inicioUtc: c.inicio,
        horasHastaInicio: Math.round(hoursUntilInicioUtc(c.inicio, nowMs) * 100) / 100,
        telefono: normalizePacienteTelefono(c.pacientes),
      })),
    }
    out.debug.ventanas.push(ventanaDebug)

    console.log('[cron/recordatorios] ventana', ventanaDebug)

    if (rows.length === 0 && !error) {
      const { data: proximas } = await supabase
        .from('citas')
        .select('id, inicio, estado, pacientes ( telefono )')
        .in('estado', ['pendiente', 'confirmada'])
        .gte('inicio', new Date(nowMs).toISOString())
        .order('inicio', { ascending: true })
        .limit(5)
      console.log('[cron/recordatorios] sin citas en ventana — próximas 5 (UTC)', {
        tipo: cfg.tipo,
        ventana: {
          trueDesdeUtc: bounds.trueWindow.desdeUtc,
          trueHastaUtc: bounds.trueWindow.hastaUtc,
          queryDesdeUtc: bounds.queryDesdeUtc,
          queryHastaUtc: bounds.queryHastaUtc,
        },
        proximas: (proximas ?? []).map((c) => {
          const row = c as { id: string; inicio: string; estado: string; pacientes: CitaCronRow['pacientes'] }
          return {
            id: row.id,
            inicioUtc: row.inicio,
            horasHastaInicio: Math.round(hoursUntilInicioUtc(row.inicio, nowMs) * 100) / 100,
            telefono: normalizePacienteTelefono(row.pacientes),
            estado: row.estado,
          }
        }),
      })
    }

    if (error) {
      out.errores.push(`list ${cfg.tipo}: ${error.message}`)
      console.error('[cron/recordatorios] query error', cfg.tipo, error)
      continue
    }

    for (const c of rows) {
      const r = await sendWhatsappReminderInternal(supabase, {
        clinicaId: c.clinica_id,
        citaId: c.id,
        tipoMensaje: cfg.tipo,
      })
      const detalle = {
        citaId: c.id,
        tipo: cfg.tipo,
        status: r.status,
        ...(r.status === 'omitido' ? { reason: r.reason } : {}),
        ...(r.status === 'fallido' ? { reason: r.error } : {}),
      }
      out.debug.envioDetalle.push(detalle)
      console.log('[cron/recordatorios] envio', detalle)

      if (r.status === 'enviado') out.enviados += 1
      else if (r.status === 'fallido') out.fallidos += 1
      else out.omitidos += 1
    }
  }

  const postTrueDesdeMs = nowMs - 150 * 60 * 1000
  const postTrueHastaMs = nowMs - 90 * 60 * 1000
  const postOffsetMs = storedInicioOffsetMs((postTrueDesdeMs + postTrueHastaMs) / 2)
  const postQueryDesdeUtc = new Date(postTrueDesdeMs - postOffsetMs - 2 * MS_PER_HOUR).toISOString()
  const postQueryHastaUtc = new Date(postTrueHastaMs - postOffsetMs + 2 * MS_PER_HOUR).toISOString()
  const postTrueDesdeUtc = new Date(postTrueDesdeMs).toISOString()
  const postTrueHastaUtc = new Date(postTrueHastaMs).toISOString()

  const { data: postCitasRaw, error: postErr } = await supabase
    .from('citas')
    .select('id, clinica_id, fin, pacientes ( telefono )')
    .eq('estado', 'completada')
    .gte('fin', postQueryDesdeUtc)
    .lte('fin', postQueryHastaUtc)

  const postCitas = (postCitasRaw ?? []).filter((c) => {
    const finMs = citaInicioToUtcMs(c.fin as string)
    return finMs >= postTrueDesdeMs && finMs <= postTrueHastaMs
  })

  out.debug.postCita = {
    trueDesdeUtc: postTrueDesdeUtc,
    trueHastaUtc: postTrueHastaUtc,
    queryDesdeUtc: postQueryDesdeUtc,
    queryHastaUtc: postQueryHastaUtc,
    encontradasQuery: postCitasRaw?.length ?? 0,
    encontradas: postCitas.length,
  }
  console.log('[cron/recordatorios] post_cita', out.debug.postCita)

  if (postErr) {
    out.errores.push(`list post_cita: ${postErr.message}`)
  } else {
    for (const c of postCitas) {
      const r = await sendWhatsappReminderInternal(supabase, {
        clinicaId: c.clinica_id,
        citaId: c.id,
        tipoMensaje: 'post_cita',
      })
      out.debug.envioDetalle.push({
        citaId: c.id,
        tipo: 'post_cita',
        status: r.status,
        ...(r.status === 'omitido' ? { reason: r.reason } : {}),
        ...(r.status === 'fallido' ? { reason: r.error } : {}),
      })
      if (r.status === 'enviado') out.enviados += 1
      else if (r.status === 'fallido') out.fallidos += 1
      else out.omitidos += 1
    }
  }

  console.log('[cron/recordatorios] resumen', {
    enviados: out.enviados,
    fallidos: out.fallidos,
    omitidos: out.omitidos,
    errores: out.errores,
  })

  return out
}

async function notifyClinicCancellation(
  supabase: SupabaseClient,
  row: CitaWhatsAppRow,
): Promise<void> {
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('id, nombre, telefono')
    .eq('id', row.clinica_id)
    .maybeSingle()

  const to = clinicPhoneToWhatsApp(clinica?.telefono ?? null)
  if (!to || !clinica) return

  const ctx = ctxFromCita(row)
  const body = templates.plantillaNotificacionClinicaCancelacion({
    clinicaNombre: clinica.nombre,
    pacienteNombre: ctx.pacienteNombre,
    inicioLegible: ctx.inicioLegible,
    servicioNombre: ctx.servicioNombre,
  })

  const provider = getWhatsappProvider()
  const result = await provider.sendWhatsApp({ to, body })

  await supabase.from('whatsapp_logs').insert({
    clinica_id: row.clinica_id,
    cita_id: row.id,
    paciente_telefono: to,
    tipo_mensaje: 'notificacion_clinica_cancelacion',
    estado: result.ok ? 'enviado' : 'fallido',
    respuesta_paciente: result.ok ? null : (result.error ?? '').slice(0, 500),
  })
}

export async function handleInboundTwilioMessage(opts: {
  supabase: SupabaseClient
  from: string
  body: string
  signature: string | null
  requestUrl: string
  /** Parámetros POST (Twilio form) para validar firma */
  formParams: Record<string, string>
}): Promise<{ handled: boolean; detail: string }> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const strict = process.env.TWILIO_VALIDATE_WEBHOOK === '1'
  if (strict && authToken) {
    const ok = verifyTwilioSignature(authToken, opts.signature, opts.requestUrl, opts.formParams)
    if (!ok) return { handled: false, detail: 'firma inválida' }
  }

  const fromDigits = digitsOnly(opts.from)
  const answer = parsePatientResponse(opts.body)
  if (!answer) return { handled: false, detail: 'respuesta no reconocida' }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs, error } = await opts.supabase
    .from('whatsapp_logs')
    .select('id, cita_id, clinica_id, paciente_telefono, tipo_mensaje')
    .eq('estado', 'enviado')
    .in('tipo_mensaje', ['recordatorio_24h', 'recordatorio_2h', 'confirmacion', 'manual'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error || !logs?.length) {
    return { handled: false, detail: error?.message ?? 'sin logs' }
  }

  const match = logs.find((l) => digitsOnly(l.paciente_telefono) === fromDigits && l.cita_id)
  if (!match?.cita_id) return { handled: false, detail: 'sin cita asociada' }

  const cita = await fetchCitaForWhatsApp(opts.supabase, match.cita_id)
  if (!cita) return { handled: false, detail: 'cita no encontrada' }

  await opts.supabase
    .from('whatsapp_logs')
    .update({
      estado: 'respondido',
      respuesta_paciente: answer.toUpperCase(),
    })
    .eq('id', match.id)

  if (answer === 'si') {
    if (cita.estado !== 'cancelada') {
      await opts.supabase.from('citas').update({ estado: 'confirmada' }).eq('id', cita.id)
    }
    return { handled: true, detail: 'confirmada' }
  }

  if (cita.estado !== 'cancelada') {
    await opts.supabase.from('citas').update({ estado: 'cancelada' }).eq('id', cita.id)
  }

  try {
    await notifyClinicCancellation(opts.supabase, cita)
  } catch (e) {
    console.error('[whatsapp] notify clinic', e)
  }

  return { handled: true, detail: 'cancelada' }
}
