'use client'

import { createClient } from '@/lib/supabase/client'
import { addDays } from 'date-fns'

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
  created_at: string
}

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

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
}

// ─── Citas del día con joins completos ────────────────────────────────────────

export async function getCitasDelDia(fecha: string): Promise<CitaConRelaciones[]> {
  const supabase = createClient()

  const { data, error } = await supabase
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

  console.log('Citas resultado:', data, 'Error:', error)
  console.log('Fecha buscada:', `${fecha}T00:00:00`, `${fecha}T23:59:59`)

  if (error) {
    console.error('Error getCitasDelDia:', error)
    return []
  }
  return (data ?? []) as CitaConRelaciones[]
}

// ─── Citas de la semana (filtrable por profesional) ───────────────────────────

export async function getCitasDeSemana(
  fechaInicio: string,
  fechaFin: string,
  profesionalId?: string
): Promise<CitaConRelaciones[]> {
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

  const { data, error } = await query

  if (error) {
    console.error('Error getCitasDeSemana:', error)
    return []
  }
  return (data ?? []) as CitaConRelaciones[]
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
  clinicaId: string
): Promise<PacienteRow | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('pacientes')
    .insert({ nombre: nombre.trim(), telefono: telefono.trim(), clinica_id: clinicaId })
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
  excludeCitaId?: string
): Promise<CitaConRelaciones | null> {
  const supabase = createClient()

  let query = supabase
    .from('citas')
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .eq('profesional_id', profesionalId)
    .not('estado', 'in', '("cancelada","no_asistio")')
    // Hay conflicto si los rangos se solapan: inicio_existente < fin_nueva AND fin_existente > inicio_nueva
    .lt('inicio', fin)
    .gt('fin', inicio)
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
      estado: 'pendiente',
    })
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .single()

  if (error) {
    console.error('Error crearCita:', error)
    return null
  }
  return nueva as CitaConRelaciones
}

// ─── Editar cita existente ────────────────────────────────────────────────────

export async function editarCita(
  citaId: string,
  data: Partial<NuevaCitaData> & { estado?: EstadoCita }
): Promise<CitaConRelaciones | null> {
  const supabase = createClient()

  const { data: actualizada, error } = await supabase
    .from('citas')
    .update(data)
    .eq('id', citaId)
    .select(`*, pacientes(*), profesionales(*), servicios(*)`)
    .single()

  if (error) {
    console.error('Error editarCita:', error)
    return null
  }
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
  return true
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
