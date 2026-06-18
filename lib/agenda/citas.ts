import { createClient } from '@/lib/supabase/client'
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns'
import type { CitaConRelaciones, NuevaCitaData, EstadoCita, SupabaseListResult } from './types'
import { withCache, withRetry, invalidateAgendaCache } from './cache'
import { triggerCitaJobs, triggerGoogleSync, dispararNotificacionCita } from './triggers'

export async function getCitasDelDia(fecha: string, profesionalId?: string): Promise<CitaConRelaciones[]> {
  return withCache(`citas-dia:${fecha}:${profesionalId ?? 'all'}`, 20_000, async () => {
    const supabase = createClient()
    let query = supabase
      .from('citas')
      .select(`*, pacientes(*), profesionales(*), servicios(*)`)
      .gte('inicio', `${fecha}T00:00:00`)
      .lte('inicio', `${fecha}T23:59:59`)
      .order('inicio', { ascending: true })
    if (profesionalId) query = query.eq('profesional_id', profesionalId)
    const { data, error } = await withRetry<SupabaseListResult<CitaConRelaciones>>(() => query)
    if (error) { console.error('Error getCitasDelDia:', error); return [] }
    return (data ?? []) as CitaConRelaciones[]
  })
}

export async function getCitasDeSemana(
  fechaInicio: string,
  fechaFin: string,
  profesionalId?: string
): Promise<CitaConRelaciones[]> {
  return withCache(`citas-semana:${fechaInicio}:${fechaFin}:${profesionalId ?? 'all'}`, 20_000, async () => {
    const supabase = createClient()
    let query = supabase
      .from('citas')
      .select(`*, pacientes(*), profesionales(*), servicios(*)`)
      .gte('inicio', `${fechaInicio}T00:00:00`)
      .lte('inicio', `${fechaFin}T23:59:59`)
      .order('inicio', { ascending: true })
    if (profesionalId) query = query.eq('profesional_id', profesionalId)
    const { data, error } = await withRetry<SupabaseListResult<CitaConRelaciones>>(() => query)
    if (error) { console.error('Error getCitasDeSemana:', error); return [] }
    return (data ?? []) as CitaConRelaciones[]
  })
}

export async function getCitasDelMes(
  fechaInicio: string,
  fechaFin: string,
  profesionalId?: string
): Promise<CitaConRelaciones[]> {
  return withCache(`citas-mes:${fechaInicio}:${fechaFin}:${profesionalId ?? 'all'}`, 30_000, async () => {
    const supabase = createClient()
    let query = supabase
      .from('citas')
      .select(`*, pacientes(*), profesionales(*), servicios(*)`)
      .gte('inicio', `${fechaInicio}T00:00:00`)
      .lte('inicio', `${fechaFin}T23:59:59`)
      .order('inicio', { ascending: true })
    if (profesionalId) query = query.eq('profesional_id', profesionalId)
    const { data, error } = await withRetry<SupabaseListResult<CitaConRelaciones>>(() => query)
    if (error) { console.error('Error getCitasDelMes:', error); return [] }
    return (data ?? []) as CitaConRelaciones[]
  })
}

export async function verificarConflicto(
  profesionalId: string,
  inicio: string,
  fin: string,
  excludeCitaId?: string,
  bufferMinutos = 0
): Promise<CitaConRelaciones | null> {
  const supabase = createClient()
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
    .lt('inicio', finBusqueda)
    .gt('fin', inicioBusqueda)
    .limit(1)
  if (excludeCitaId) query = query.neq('id', excludeCitaId)

  const { data, error } = await query
  if (error) { console.error('Error verificarConflicto:', error); return null }
  return data && data.length > 0 ? (data[0] as CitaConRelaciones) : null
}

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
      .select(`*, cancel_token, pacientes(*), profesionales(*), servicios(*), clinicas(nombre, email, telefono, direccion, logo_url)`)
      .single()
    if (error) { console.error('Error crearCita fallback:', error); return null }
    invalidateAgendaCache()
    await triggerCitaJobs((nueva as CitaConRelaciones).id, 'schedule')
    triggerGoogleSync((nueva as CitaConRelaciones).id, 'create')
    dispararNotificacionCita(nueva as CitaConRelaciones).catch(() => {})
    return nueva as CitaConRelaciones
  }

  const { data: citaCompleta, error: errorSelect } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*), clinicas(nombre, email, telefono, direccion, logo_url)`)
    .eq('id', citaId)
    .single()
  if (errorSelect) { console.error('Error crearCita select:', errorSelect); return null }
  invalidateAgendaCache()
  await triggerCitaJobs(citaCompleta.id, 'schedule')
  triggerGoogleSync(citaCompleta.id, 'create')
  dispararNotificacionCita(citaCompleta as CitaConRelaciones).catch(() => {})
  return citaCompleta as CitaConRelaciones
}

export async function crearCitasRecurrentes(
  data: NuevaCitaData,
  recurrenceKind: 'daily' | 'weekly' | 'monthly',
  totalCitas = 8,
  horaOverrides: Record<number, string> = {},
  fechaOverrides: Record<number, string> = {}
): Promise<CitaConRelaciones | null> {
  const horaBase = data.inicio.slice(11, 16)
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

  const n = Math.max(1, totalCitas - 1)
  const ocurrencias = Array.from({ length: n }, (_, i) => {
    const idx = i + 1
    const baseDate =
      recurrenceKind === 'daily' ? addDays(parseISO(data.inicio), idx)
      : recurrenceKind === 'weekly' ? addWeeks(parseISO(data.inicio), idx)
      : addMonths(parseISO(data.inicio), idx)
    const fechaStr = fechaOverrides[idx] ?? format(baseDate, 'yyyy-MM-dd')
    const horaSession = horaOverrides[idx] ?? horaBase
    const inicioDate = parseISO(`${fechaStr}T${horaSession}:00`)
    const finDate = new Date(inicioDate.getTime() + duracionMs)
    return {
      clinica_id: data.clinica_id,
      paciente_id: data.paciente_id,
      profesional_id: data.profesional_id,
      servicio_id: data.servicio_id,
      inicio: format(inicioDate, "yyyy-MM-dd'T'HH:mm:ss"),
      fin: format(finDate, "yyyy-MM-dd'T'HH:mm:ss"),
      notas: data.notas ?? null,
      estado: 'pendiente' as const,
      recurrence_kind: recurrenceKind,
      recurrence_rule: data.recurrence_rule ?? null,
      recurrence_parent_id: citaPadre.id,
      recurrence_instance_date: fechaStr,
    }
  })

  const supabase = createClient()
  const { error } = await supabase.from('citas').insert(ocurrencias)
  if (error) {
    console.error('[agenda] crearCitasRecurrentes batch insert falló:', error)
    return null
  }
  invalidateAgendaCache()
  return citaPadre
}

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
  if (errorRpc && errorRpc.code !== '42883') { console.error('Error editarCita RPC:', errorRpc); return null }

  const cancelarJobs =
    (data.inicio !== undefined && data.inicio !== previa.inicio) ||
    (data.fin !== undefined && data.fin !== previa.fin) ||
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
  triggerGoogleSync(citaId, 'update')

  if (!actualizadaRpc) {
    const { data: actualizadaFallback, error: errorFallback } = await supabase
      .from('citas')
      .update(data)
      .eq('id', citaId)
      .select(`*, pacientes(*), profesionales(*), servicios(*)`)
      .single()
    if (errorFallback) { console.error('Error editarCita fallback:', errorFallback); return null }
    invalidateAgendaCache()
    return actualizadaFallback as CitaConRelaciones
  }

  const { data: actualizada, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('id', citaId)
    .single()
  if (error) { console.error('Error editarCita select:', error); return null }
  invalidateAgendaCache()
  return actualizada as CitaConRelaciones
}

export async function actualizarEstadoCita(citaId: string, estado: EstadoCita): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('citas').update({ estado }).eq('id', citaId)
  if (error) { console.error('Error actualizarEstadoCita:', error); return false }
  invalidateAgendaCache()
  triggerGoogleSync(citaId, estado === 'cancelada' ? 'delete' : 'update')
  return true
}

export async function getHistorialPaciente(pacienteId: string): Promise<CitaConRelaciones[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('paciente_id', pacienteId)
    .order('inicio', { ascending: false })
    .limit(5)
  if (error) { console.error('Error getHistorialPaciente:', error); return [] }
  return (data ?? []) as CitaConRelaciones[]
}

export async function getCitasPendientes48h(dias = 7): Promise<CitaConRelaciones[]> {
  const supabase = createClient()
  const ahora = new Date().toISOString()
  const hasta = addDays(new Date(), dias).toISOString()
  const { data, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('estado', 'pendiente')
    .gte('inicio', ahora)
    .lte('inicio', hasta)
    .order('inicio', { ascending: true })
  if (error) { console.error('Error getCitasPendientes48h:', error); return [] }
  return (data ?? []) as CitaConRelaciones[]
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

export async function getCitaById(citaId: string): Promise<CitaConRelaciones | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('id', citaId)
    .single()
  if (error) return null
  return data as CitaConRelaciones
}
