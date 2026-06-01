'use client'

import { createClient } from '@/lib/supabase/client'
import type { PostgrestError } from '@supabase/supabase-js'
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns'
import { getClinicaConfig } from '@/lib/onboarding/queries'

async function triggerCitaJobs(citaId: string, action: 'schedule' | 'cancel' | 'reschedule'): Promise<void> {
  try {
    await fetch('/api/citas/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citaId, action }),
    })
  } catch (e) {
    console.warn('[agenda] triggerCitaJobs falló (no crítico):', e)
  }
}

/** Resultado típico de `.select()` en listas; evita que `withRetry` infiera `unknown`. */
type SupabaseListResult<T> = { data: T[] | null; error: PostgrestError | null }

const agendaCache = new Map<string, { expiresAt: number; value: unknown }>()
const inflight = new Map<string, Promise<unknown>>()

function withCache<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const cached = agendaCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value as T)
  }

  const current = inflight.get(key)
  if (current) return current as Promise<T>

  const promise = load()
    .then((value) => {
      agendaCache.set(key, { expiresAt: Date.now() + ttlMs, value })
      inflight.delete(key)
      return value
    })
    .catch((error) => {
      inflight.delete(key)
      throw error
    })

  inflight.set(key, promise)
  return promise
}

function invalidateAgendaCache() {
  for (const key of agendaCache.keys()) {
    if (key.startsWith('citas-')) agendaCache.delete(key)
  }
}

async function withRetry<T>(fn: () => PromiseLike<T> | T, attempts = 2): Promise<T> {
  let lastError: unknown
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await Promise.resolve(fn())
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)))
    }
  }
  throw lastError
}

// ─── Tipos que reflejan exactamente las columnas de Supabase ───────────────────

export type ProfesionalRow = {
  id: string
  clinica_id: string
  nombre: string
  especialidad: string | null
  email: string | null
  telefono: string | null
  color: string
  activo: boolean
  created_at: string
  foto_url?: string | null
  bio?: string | null
  servicios?: string[]
}

export type PacienteRow = {
  id: string
  clinica_id: string
  nombre: string
  email: string | null
  telefono: string | null
  rut: string | null
  fecha_nacimiento: string | null
  notas: string | null
  activo: boolean
  created_at: string
}

export type ServicioRow = {
  id: string
  clinica_id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  precio: number
  color: string
  activo: boolean
  buffer_minutos: number
  created_at: string
}

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
export type PagoEstado = 'pendiente' | 'pagado' | 'parcial'
export type PagoMetodo = 'efectivo' | 'transferencia' | 'debito' | 'credito'

// Cita con joins a paciente, profesional y servicio
export type CitaConRelaciones = {
  id: string
  clinica_id: string
  paciente_id: string
  profesional_id: string
  servicio_id: string
  inicio: string
  fin: string
  estado: EstadoCita
  notas: string | null
  recordatorio_enviado: boolean
  updated_at?: string
  lock_version?: number
  recurrence_kind?: 'none' | 'daily' | 'weekly' | 'monthly' | 'rrule'
  recurrence_rule?: string | null
  recurrence_parent_id?: string | null
  recurrence_instance_date?: string | null
  event_timezone?: string
  pago_monto?: number
  pago_estado?: PagoEstado
  pago_metodo?: PagoMetodo | null
  pago_registrado_at?: string | null
  buffer_minutos?: number
  created_at: string
  pacientes: PacienteRow
  profesionales: ProfesionalRow
  servicios: ServicioRow
}

export type NuevaCitaData = {
  clinica_id: string
  paciente_id: string
  profesional_id: string
  servicio_id: string
  inicio: string  // ISO string
  fin: string     // ISO string
  notas?: string
  estado?: EstadoCita
  expected_lock_version?: number
  recurrence_kind?: 'none' | 'daily' | 'weekly' | 'monthly' | 'rrule'
  recurrence_rule?: string | null
  recurrence_parent_id?: string | null
  recurrence_instance_date?: string | null
  buffer_minutos?: number
}

export type DisponibilidadRow = {
  id: string
  clinica_id: string
  profesional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

export type BloqueoAgendaRow = {
  id: string
  clinica_id: string
  profesional_id: string | null
  titulo: string
  motivo: string | null
  inicio: string
  fin: string
  tipo: 'bloqueo' | 'vacaciones' | 'feriado' | 'almuerzo' | 'capacitacion'
}

export type AuditLogRow = {
  id: string
  clinica_id: string
  cita_id: string | null
  actor_id: string | null
  accion: string
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  created_at: string
}

// ─── Citas del día con joins completos ────────────────────────────────────────

export async function getCitasDelDia(fecha: string): Promise<CitaConRelaciones[]> {
  return withCache(`citas-dia:${fecha}`, 20_000, async () => {
    const supabase = createClient()
    const { data, error } = await withRetry<SupabaseListResult<CitaConRelaciones>>(() =>
      supabase
        .from('citas')
        .select(`
          *,
          pacientes(*),
          profesionales(*),
          servicios(*)
        `)
        .gte('inicio', `${fecha}T00:00:00`)
        .lte('inicio', `${fecha}T23:59:59`)
        .order('inicio', { ascending: true })
    )

    if (error) {
      console.error('Error getCitasDelDia:', error)
      return []
    }
    return (data ?? []) as CitaConRelaciones[]
  })
}

// ─── Citas de la semana (filtrable por profesional) ───────────────────────────

export async function getCitasDeSemana(
  fechaInicio: string,
  fechaFin: string,
  profesionalId?: string
): Promise<CitaConRelaciones[]> {
  return withCache(`citas-semana:${fechaInicio}:${fechaFin}:${profesionalId ?? 'all'}`, 20_000, async () => {
    const supabase = createClient()
    let query = supabase
      .from('citas')
      .select(`
        *,
        pacientes(*),
        profesionales(*),
        servicios(*)
      `)
      .gte('inicio', `${fechaInicio}T00:00:00`)
      .lte('inicio', `${fechaFin}T23:59:59`)
      .order('inicio', { ascending: true })

    if (profesionalId) {
      query = query.eq('profesional_id', profesionalId)
    }

    const { data, error } = await withRetry<SupabaseListResult<CitaConRelaciones>>(() => query)
    if (error) {
      console.error('Error getCitasDeSemana:', error)
      return []
    }
    return (data ?? []) as CitaConRelaciones[]
  })
}

export async function getCitasDelMes(
  fechaInicio: string,  // 'yyyy-MM-dd' first day of month
  fechaFin: string,     // 'yyyy-MM-dd' last day of month
): Promise<CitaConRelaciones[]> {
  return withCache(`citas-mes:${fechaInicio}:${fechaFin}`, 30_000, async () => {
    const supabase = createClient()
    const { data, error } = await withRetry<SupabaseListResult<CitaConRelaciones>>(() =>
      supabase
        .from('citas')
        .select(`*, pacientes(*), profesionales(*), servicios(*)`)
        .gte('inicio', `${fechaInicio}T00:00:00`)
        .lte('inicio', `${fechaFin}T23:59:59`)
        .order('inicio', { ascending: true })
    )
    if (error) {
      console.error('Error getCitasDelMes:', error)
      return []
    }
    return (data ?? []) as CitaConRelaciones[]
  })
}

// ─── Profesionales activos de la clínica ──────────────────────────────────────

export async function getProfesionales(): Promise<ProfesionalRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profesionales')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error getProfesionales:', error)
    return []
  }
  return (data ?? []) as ProfesionalRow[]
}

// ─── Profesionales con sus servicios asignados ────────────────────────────────

export async function getProfesionalesConServicios(): Promise<(ProfesionalRow & { servicios: string[] })[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profesionales')
    .select('*, profesional_servicios(servicio_id)')
    .eq('activo', true)
    .order('nombre')
  return (data ?? []).map((p: ProfesionalRow & { profesional_servicios?: { servicio_id: string }[] }) => ({
    ...p,
    servicios: (p.profesional_servicios ?? []).map((ps: { servicio_id: string }) => ps.servicio_id),
  }))
}

// ─── Servicios activos de la clínica ──────────────────────────────────────────

export async function getServicios(): Promise<ServicioRow[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error getServicios:', error)
    return []
  }
  return (data ?? []) as ServicioRow[]
}

// ─── Servicios para agenda (opcional incluir inactivos) ───────────────────────
export async function getServiciosAgenda(includeInactivos = false): Promise<ServicioRow[]> {
  const supabase = createClient()

  let query = supabase
    .from('servicios')
    .select('*')
    .order('nombre', { ascending: true })

  if (!includeInactivos) {
    query = query.eq('activo', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error getServiciosAgenda:', error)
    return []
  }
  return (data ?? []) as ServicioRow[]
}

// ─── Búsqueda de pacientes por nombre o teléfono ──────────────────────────────

export async function getPacientesBusqueda(query: string): Promise<PacienteRow[]> {
  if (!query || query.trim().length < 2) return []
  const supabase = createClient()
  const termino = query.trim()

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .or(`nombre.ilike.%${termino}%,telefono.ilike.%${termino}%`)
    .eq('activo', true)
    .limit(10)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error getPacientesBusqueda:', error)
    return []
  }
  return (data ?? []) as PacienteRow[]
}

// ─── Crear paciente rápido desde el modal de cita ─────────────────────────────

export async function crearPacienteRapido(
  nombre: string,
  telefono: string,
  clinicaId: string,
  email?: string
): Promise<PacienteRow | null> {
  const supabase = createClient()

  const insertData: Record<string, string> = { nombre: nombre.trim(), telefono: telefono.trim(), clinica_id: clinicaId }
  if (email?.trim()) insertData.email = email.trim()

  const { data, error } = await supabase
    .from('pacientes')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error crearPacienteRapido:', error)
    return null
  }
  return data as PacienteRow
}

// ─── Verificar conflicto de horario antes de crear/editar cita ────────────────

export async function verificarConflicto(
  profesionalId: string,
  inicio: string,
  fin: string,
  excludeCitaId?: string,
  bufferMinutos = 0
): Promise<CitaConRelaciones | null> {
  const supabase = createClient()

  // Cuando hay buffer, la zona ocupada de la cita existente se extiende bufferMinutos después de su fin.
  // Para detectar esto, buscamos citas existentes donde:
  //   inicio_existente < fin_nueva  (la cita existente comienza antes de que termine la nueva)
  //   fin_existente + buffer > inicio_nueva  (la cita existente + buffer termina después de que inicia la nueva)
  //
  // Equivalentemente, se puede ampliar el fin de búsqueda y el inicio de búsqueda:
  //   inicio_existente < fin + buffer  (para cubrir citas que comienzan antes del fin+buffer de la nueva)
  //   fin_existente > inicio - buffer  (para cubrir citas cuyo fin+buffer supera el inicio de la nueva)
  const finBusqueda = bufferMinutos > 0
    ? format(new Date(parseISO(fin).getTime() + bufferMinutos * 60_000), "yyyy-MM-dd'T'HH:mm:ss")
    : fin
  const inicioBusqueda = bufferMinutos > 0
    ? format(new Date(parseISO(inicio).getTime() - bufferMinutos * 60_000), "yyyy-MM-dd'T'HH:mm:ss")
    : inicio

  let query = supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('profesional_id', profesionalId)
    .not('estado', 'in', '("cancelada","no_asistio")')
    // Hay conflicto si los rangos (con buffer) se solapan
    .lt('inicio', finBusqueda)
    .gt('fin', inicioBusqueda)
    .limit(1)

  if (excludeCitaId) {
    query = query.neq('id', excludeCitaId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error verificarConflicto:', error)
    return null
  }
  return data && data.length > 0 ? (data[0] as CitaConRelaciones) : null
}

// ─── Crear nueva cita ─────────────────────────────────────────────────────────

export async function crearCita(data: NuevaCitaData): Promise<CitaConRelaciones | null> {
  const supabase = createClient()

  const { data: creadaPorRpc, error: errorRpc } = await supabase.rpc('upsert_cita_atomic', {
    p_cita_id: null,
    p_clinica_id: data.clinica_id,
    p_paciente_id: data.paciente_id,
    p_profesional_id: data.profesional_id,
    p_servicio_id: data.servicio_id,
    p_inicio: data.inicio,
    p_fin: data.fin,
    p_notas: data.notas ?? null,
    p_estado: data.estado ?? 'pendiente',
    p_expected_lock_version: null,
  })

  const citaId = (creadaPorRpc as { id?: string } | null)?.id
  if (errorRpc && errorRpc.code !== '42883') {
    console.error('Error crearCita RPC:', errorRpc)
    return null
  }

  if (!citaId) {
    const { data: nueva, error } = await supabase
      .from('citas')
      .insert({
        clinica_id: data.clinica_id,
        paciente_id: data.paciente_id,
        profesional_id: data.profesional_id,
        servicio_id: data.servicio_id,
        inicio: data.inicio,
        fin: data.fin,
        notas: data.notas ?? null,
        estado: data.estado ?? 'pendiente',
        recurrence_kind: data.recurrence_kind ?? 'none',
        recurrence_rule: data.recurrence_rule ?? null,
        recurrence_parent_id: data.recurrence_parent_id ?? null,
        recurrence_instance_date: data.recurrence_instance_date ?? null,
        buffer_minutos: data.buffer_minutos ?? 0,
      })
      .select(`*, pacientes(*), profesionales(*), servicios(*)`)
      .single()

    if (error) {
      console.error('Error crearCita fallback:', error)
      return null
    }
    return nueva as CitaConRelaciones
  }

  const { data: citaCompleta, error: errorSelect } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('id', citaId)
    .single()

  if (errorSelect) {
    console.error('Error crearCita select:', errorSelect)
    return null
  }
  invalidateAgendaCache()
  await triggerCitaJobs(citaCompleta.id, 'schedule')

  // Disparar notificaciones (no bloquea el flujo)
  dispararNotificacionCita(citaCompleta as CitaConRelaciones).catch(() => {})

  return citaCompleta as CitaConRelaciones
}

function dispararNotificacionCita(cita: CitaConRelaciones) {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpliclinic.vercel.app')
  const paciente = cita.pacientes as { nombre: string; email?: string | null; telefono?: string | null } | null
  const profesional = cita.profesionales as { nombre: string } | null
  const servicio = cita.servicios as { nombre: string } | null
  const clinica = { nombre: '', telefono: null, email: null, direccion: null }
  return fetch(`${base}/api/notificar-cita`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'nueva_cita',
      canal: 'agenda',
      paciente: { nombre: paciente?.nombre ?? '', email: paciente?.email, telefono: paciente?.telefono },
      profesional: { nombre: profesional?.nombre ?? '' },
      servicio: { nombre: servicio?.nombre ?? '' },
      clinica,
      inicio: cita.inicio,
      fin: cita.fin,
    }),
  })
}

// ─── Crear citas recurrentes ──────────────────────────────────────────────────

export async function crearCitasRecurrentes(
  data: NuevaCitaData,
  recurrenceKind: 'daily' | 'weekly' | 'monthly',
  totalCitas = 8,
  horaOverrides: Record<number, string> = {},
  fechaOverrides: Record<number, string> = {}
): Promise<CitaConRelaciones | null> {
  // Apply override for session 0 (the parent) if provided
  const horaBase = data.inicio.slice(11, 16) // HH:mm
  const horaParent = horaOverrides[0] ?? horaBase
  const duracionMs = parseISO(data.fin).getTime() - parseISO(data.inicio).getTime()

  let dataParent = data
  if (horaOverrides[0] && horaOverrides[0] !== horaBase) {
    const fechaParent = data.inicio.slice(0, 10)
    const inicioParent = `${fechaParent}T${horaParent}:00`
    const finParent = format(new Date(parseISO(inicioParent).getTime() + duracionMs), "yyyy-MM-dd'T'HH:mm:ss")
    dataParent = { ...data, inicio: inicioParent, fin: finParent }
  }

  const citaPadre = await crearCita(dataParent)
  if (!citaPadre) return null

  const n = Math.max(1, totalCitas - 1) // padre ya cuenta como 1

  const ocurrencias = Array.from({ length: n }, (_, i) => {
    const idx = i + 1
    const baseDate =
      recurrenceKind === 'daily'
        ? addDays(parseISO(data.inicio), idx)
        : recurrenceKind === 'weekly'
        ? addWeeks(parseISO(data.inicio), idx)
        : addMonths(parseISO(data.inicio), idx)

    const fechaStr = fechaOverrides[idx] ?? format(baseDate, 'yyyy-MM-dd')
    const horaSession = horaOverrides[idx] ?? horaBase
    const inicioDate = parseISO(`${fechaStr}T${horaSession}:00`)
    const finDate = new Date(inicioDate.getTime() + duracionMs)

    const inicioStr = format(inicioDate, "yyyy-MM-dd'T'HH:mm:ss")
    const finStr = format(finDate, "yyyy-MM-dd'T'HH:mm:ss")
    const instanceDate = fechaStr

    return {
      clinica_id: data.clinica_id,
      paciente_id: data.paciente_id,
      profesional_id: data.profesional_id,
      servicio_id: data.servicio_id,
      inicio: inicioStr,
      fin: finStr,
      notas: data.notas ?? null,
      estado: 'pendiente' as const,
      recurrence_kind: recurrenceKind,
      recurrence_rule: data.recurrence_rule ?? null,
      recurrence_parent_id: citaPadre.id,
      recurrence_instance_date: instanceDate,
    }
  })

  const supabase = createClient()
  const { error } = await supabase.from('citas').insert(ocurrencias)
  if (error) {
    console.warn('[agenda] crearCitasRecurrentes: batch insert parcial falló (no crítico):', error)
  }

  invalidateAgendaCache()
  return citaPadre
}

// ─── Editar cita existente ────────────────────────────────────────────────────

export async function editarCita(
  citaId: string,
  data: Partial<NuevaCitaData> & { estado?: EstadoCita }
): Promise<CitaConRelaciones | null> {
  const supabase = createClient()

  const { data: previa } = await supabase
    .from('citas')
    .select('clinica_id, paciente_id, profesional_id, servicio_id, inicio, fin, notas, estado, lock_version')
    .eq('id', citaId)
    .single()

  if (!previa) return null

  const { data: actualizadaRpc, error: errorRpc } = await supabase.rpc('upsert_cita_atomic', {
    p_cita_id: citaId,
    p_clinica_id: previa.clinica_id,
    p_paciente_id: data.paciente_id ?? previa.paciente_id,
    p_profesional_id: data.profesional_id ?? previa.profesional_id,
    p_servicio_id: data.servicio_id ?? previa.servicio_id,
    p_inicio: data.inicio ?? previa.inicio,
    p_fin: data.fin ?? previa.fin,
    p_notas: data.notas ?? previa.notas,
    p_estado: data.estado ?? previa.estado,
    p_expected_lock_version: data.expected_lock_version ?? previa.lock_version ?? null,
  })

  if (errorRpc && errorRpc.code !== '42883') {
    console.error('Error editarCita RPC:', errorRpc)
    return null
  }

  // Si cambia la hora o se cancela/marca no-asistió, cancelar los jobs viejos
  const cancelarJobs =
    data.inicio !== undefined && data.inicio !== previa.inicio ||
    data.fin !== undefined && data.fin !== previa.fin ||
    data.estado === 'cancelada' ||
    data.estado === 'no_asistio'

  if (cancelarJobs) {
    const nuevoEstado = data.estado ?? previa.estado
    const debeReprogramar =
      nuevoEstado !== 'cancelada' &&
      nuevoEstado !== 'no_asistio' &&
      nuevoEstado !== 'completada' &&
      (data.inicio !== undefined || data.fin !== undefined)

    await triggerCitaJobs(citaId, debeReprogramar ? 'reschedule' : 'cancel')
  }

  if (!actualizadaRpc) {
    const { data: actualizadaFallback, error: errorFallback } = await supabase
      .from('citas')
      .update(data)
      .eq('id', citaId)
      .select(`*, pacientes(*), profesionales(*), servicios(*)`)
      .single()

    if (errorFallback) {
      console.error('Error editarCita fallback:', errorFallback)
      return null
    }
    invalidateAgendaCache()
    return actualizadaFallback as CitaConRelaciones
  }

  const { data: actualizada, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('id', citaId)
    .single()

  if (error) {
    console.error('Error editarCita select:', error)
    return null
  }
  invalidateAgendaCache()
  return actualizada as CitaConRelaciones
}

// ─── Actualizar solo el estado de una cita ────────────────────────────────────

export async function actualizarEstadoCita(
  citaId: string,
  estado: EstadoCita
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('citas')
    .update({ estado })
    .eq('id', citaId)

  if (error) {
    console.error('Error actualizarEstadoCita:', error)
    return false
  }
  invalidateAgendaCache()
  return true
}

const DIA_SEMANA_MAP: Record<string, number> = {
  lunes: 1, martes: 2, 'miércoles': 3, miercoles: 3,
  jueves: 4, viernes: 5, 'sábado': 6, sabado: 6, domingo: 7,
}

// ─── Disponibilidad por profesional y fecha ────────────────────────────────────
export async function getDisponibilidadProfesional(profesionalId: string): Promise<DisponibilidadRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_disponibilidad')
    .select('*')
    .eq('profesional_id', profesionalId)
    .order('dia_semana', { ascending: true })

  if (error) {
    console.error('Error getDisponibilidadProfesional:', error)
    return []
  }

  const filas = (data ?? []) as DisponibilidadRow[]
  if (filas.length > 0) return filas

  const [config, clinicaId] = await Promise.all([getClinicaConfig(), getClinicaId()])
  const horarios = config.horarios ?? {}
  const resultado: DisponibilidadRow[] = []

  for (const [dia, diaDato] of Object.entries(horarios)) {
    const diaSemana = DIA_SEMANA_MAP[dia]
    if (!diaSemana) continue
    resultado.push({
      id: `global-${diaSemana}`,
      clinica_id: clinicaId ?? '',
      profesional_id: profesionalId,
      dia_semana: diaSemana,
      hora_inicio: diaDato.desde,
      hora_fin: diaDato.hasta,
      activo: diaDato.activo,
    })
  }

  return resultado.sort((a, b) => a.dia_semana - b.dia_semana)
}

export async function setDisponibilidadProfesional(
  profesionalId: string,
  disponibilidad: DisponibilidadRow[]
): Promise<boolean> {
  const supabase = createClient()
  const clinicaId = await getClinicaId()
  if (!clinicaId) return false

  const { error: deleteError } = await supabase
    .from('agenda_disponibilidad')
    .delete()
    .eq('profesional_id', profesionalId)

  if (deleteError) {
    console.error('Error setDisponibilidadProfesional delete:', deleteError)
    return false
  }

  const filas = disponibilidad.map((d) => ({
    clinica_id: clinicaId,
    profesional_id: profesionalId,
    dia_semana: d.dia_semana,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    activo: d.activo,
  }))

  if (filas.length === 0) return true

  const { error: insertError } = await supabase
    .from('agenda_disponibilidad')
    .insert(filas)

  if (insertError) {
    console.error('Error setDisponibilidadProfesional insert:', insertError)
    return false
  }
  return true
}

export async function getBloqueosRango(
  fechaInicioIso: string,
  fechaFinIso: string
): Promise<BloqueoAgendaRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_bloqueos')
    .select('*')
    .lt('inicio', fechaFinIso)
    .gt('fin', fechaInicioIso)
    .order('inicio', { ascending: true })

  if (error) {
    console.error('Error getBloqueosRango:', error)
    return []
  }
  return (data ?? []) as BloqueoAgendaRow[]
}

export async function crearRecordatorioCita(
  clinicaId: string,
  citaId: string,
  canal: 'whatsapp' | 'email' | 'push',
  minutosAntes: number
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('agenda_recordatorios').insert({
    clinica_id: clinicaId,
    cita_id: citaId,
    canal,
    minutos_antes: minutosAntes,
    activo: true,
  })

  if (error) {
    console.error('Error crearRecordatorioCita:', error)
    return false
  }
  return true
}

export async function getAuditCita(citaId: string): Promise<AuditLogRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_audit_log')
    .select('*')
    .eq('cita_id', citaId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error getAuditCita:', error)
    return []
  }
  return (data ?? []) as AuditLogRow[]
}

// ─── Historial de visitas de un paciente (últimas 5) ─────────────────────────

export async function getHistorialPaciente(pacienteId: string): Promise<CitaConRelaciones[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('paciente_id', pacienteId)
    .order('inicio', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error getHistorialPaciente:', error)
    return []
  }
  return (data ?? []) as CitaConRelaciones[]
}

// ─── Citas pendientes en las próximas 48 horas ───────────────────────────────

export async function getCitasPendientes48h(): Promise<CitaConRelaciones[]> {
  const supabase = createClient()
  const ahora = new Date().toISOString()
  const en48h = addDays(new Date(), 2).toISOString()

  const { data, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('estado', 'pendiente')
    .gte('inicio', ahora)
    .lte('inicio', en48h)
    .order('inicio', { ascending: true })

  if (error) {
    console.error('Error getCitasPendientes48h:', error)
    return []
  }
  return (data ?? []) as CitaConRelaciones[]
}

// ─── Bloqueos de horario ──────────────────────────────────────────────────────

export type BloqueoProfesional = {
  id: string
  profesional_id: string
  inicio: string
  fin: string
  titulo: string
}

export async function getBloqueos(fecha: string): Promise<BloqueoProfesional[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('agenda_bloqueos')
    .select('id, profesional_id, inicio, fin, titulo')
    .gte('inicio', `${fecha}T00:00:00`)
    .lt('inicio', `${fecha}T23:59:59`)
  return (data ?? []) as BloqueoProfesional[]
}

export async function crearBloqueo(data: {
  clinica_id: string
  profesional_id?: string
  titulo: string
  tipo: 'bloqueo' | 'vacaciones' | 'feriado' | 'almuerzo' | 'capacitacion'
  inicio: string  // ISO wall-clock
  fin: string     // ISO wall-clock
  motivo?: string
}): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('agenda_bloqueos').insert({
    clinica_id: data.clinica_id,
    profesional_id: data.profesional_id ?? null,
    titulo: data.titulo,
    tipo: data.tipo,
    inicio: data.inicio,
    fin: data.fin,
    motivo: data.motivo ?? null,
  })
  if (error) {
    console.error('Error crearBloqueo:', error)
    return false
  }
  return true
}

export async function eliminarBloqueo(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('agenda_bloqueos').delete().eq('id', id)
  return !error
}

// ─── Obtener clinica_id del usuario autenticado ───────────────────────────────

export async function getClinicaId(): Promise<string | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clinicas')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (error) return null
  return data?.id ?? null
}

export async function getCitasFuturasPaciente(pacienteId: string): Promise<CitaConRelaciones[]> {
  const supabase = createClient()
  const ahora = new Date().toISOString()
  const { data, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('paciente_id', pacienteId)
    .gt('inicio', ahora)
    .not('estado', 'in', '("cancelada","no_asistio")')
    .order('inicio', { ascending: true })
    .limit(3)
  if (error) return []
  return (data ?? []) as CitaConRelaciones[]
}
