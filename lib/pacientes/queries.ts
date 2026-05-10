'use client'

import { subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

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

export type HistorialCitaPaciente = {
  id: string
  inicio: string
  fin: string
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
  notas: string | null
  created_at: string
  servicios: {
    nombre: string
    precio: number
  } | null
  profesionales: {
    nombre: string
    especialidad: string | null
  } | null
}

export type PacienteListaItem = PacienteRow & {
  totalCitas: number
  ultimaCita: string | null
}

type PacientesParams = {
  busqueda?: string
  filtro?: 'todos' | 'activos' | 'nuevos'
  page?: number
  pageSize?: number
}

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

export async function getPacientes({
  busqueda = '',
  filtro = 'todos',
  page = 1,
  pageSize = 20,
}: PacientesParams): Promise<{ items: PacienteListaItem[]; total: number }> {
  const supabase = createClient()
  const termino = busqueda.trim()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('pacientes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (termino) {
    query = query.or(`nombre.ilike.%${termino}%,telefono.ilike.%${termino}%,rut.ilike.%${termino}%`)
  }

  if (filtro === 'activos') {
    query = query.eq('activo', true)
  }

  if (filtro === 'nuevos') {
    query = query.gte('created_at', subDays(new Date(), 30).toISOString())
  }

  const { data, error, count } = await query
  if (error) {
    console.error('Error getPacientes:', error)
    return { items: [], total: 0 }
  }

  const pacientes = (data ?? []) as PacienteRow[]
  if (pacientes.length === 0) return { items: [], total: count ?? 0 }

  const pacienteIds = pacientes.map((p) => p.id)
  const { data: citasData, error: citasError } = await supabase
    .from('citas')
    .select('paciente_id, inicio')
    .in('paciente_id', pacienteIds)
    .order('inicio', { ascending: false })

  if (citasError) {
    console.error('Error getPacientes citas:', citasError)
  }

  const statsPorPaciente = new Map<string, { total: number; ultima: string | null }>()
  for (const p of pacientes) {
    statsPorPaciente.set(p.id, { total: 0, ultima: null })
  }

  for (const cita of citasData ?? []) {
    const prev = statsPorPaciente.get(cita.paciente_id)
    if (!prev) continue
    prev.total += 1
    if (!prev.ultima || cita.inicio > prev.ultima) {
      prev.ultima = cita.inicio
    }
  }

  return {
    items: pacientes.map((p) => {
      const stats = statsPorPaciente.get(p.id)
      return {
        ...p,
        totalCitas: stats?.total ?? 0,
        ultimaCita: stats?.ultima ?? null,
      }
    }),
    total: count ?? 0,
  }
}

export async function getPacienteDetalle(pacienteId: string): Promise<{
  paciente: PacienteRow | null
  historial: HistorialCitaPaciente[]
}> {
  const supabase = createClient()

  const [{ data: paciente, error: pacienteError }, { data: historial, error: historialError }] =
    await Promise.all([
      supabase.from('pacientes').select('*').eq('id', pacienteId).single(),
      supabase
        .from('citas')
        .select('id, inicio, fin, estado, notas, created_at, servicios(nombre, precio), profesionales(nombre, especialidad)')
        .eq('paciente_id', pacienteId)
        .order('inicio', { ascending: false }),
    ])

  if (pacienteError) {
    console.error('Error getPacienteDetalle paciente:', pacienteError)
  }
  if (historialError) {
    console.error('Error getPacienteDetalle historial:', historialError)
  }

  return {
    paciente: (paciente ?? null) as PacienteRow | null,
    historial: (historial ?? []) as HistorialCitaPaciente[],
  }
}

export type PacienteInput = {
  nombre: string
  telefono: string
  email?: string
  rut?: string
  fecha_nacimiento?: string
}

export async function crearPaciente(input: PacienteInput): Promise<PacienteRow | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const supabase = createClient()
  const payload = {
    clinica_id: clinicaId,
    nombre: input.nombre.trim(),
    telefono: input.telefono.trim(),
    email: input.email?.trim() || null,
    rut: input.rut?.trim() || null,
    fecha_nacimiento: input.fecha_nacimiento || null,
  }

  const { data, error } = await supabase.from('pacientes').insert(payload).select('*').single()
  if (error) {
    console.error('Error crearPaciente:', error)
    return null
  }

  return data as PacienteRow
}

export async function actualizarPaciente(pacienteId: string, input: PacienteInput): Promise<PacienteRow | null> {
  const supabase = createClient()
  const payload = {
    nombre: input.nombre.trim(),
    telefono: input.telefono.trim(),
    email: input.email?.trim() || null,
    rut: input.rut?.trim() || null,
    fecha_nacimiento: input.fecha_nacimiento || null,
  }

  const { data, error } = await supabase
    .from('pacientes')
    .update(payload)
    .eq('id', pacienteId)
    .select('*')
    .single()

  if (error) {
    console.error('Error actualizarPaciente:', error)
    return null
  }

  return data as PacienteRow
}

export async function actualizarNotasPaciente(pacienteId: string, notas: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('pacientes')
    .update({ notas: notas.trim() || null })
    .eq('id', pacienteId)

  if (error) {
    console.error('Error actualizarNotasPaciente:', error)
    return false
  }

  return true
}
