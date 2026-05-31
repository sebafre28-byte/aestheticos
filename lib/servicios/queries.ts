'use client'

import { subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

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

export type ServicioListaItem = ServicioRow & {
  totalCitas: number
  ultimaCita: string | null
}

export type HistorialServicio = {
  id: string
  inicio: string
  fin: string
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
  pacientes: {
    nombre: string
    telefono: string | null
  } | null
  profesionales: {
    nombre: string
    especialidad: string | null
  } | null
}

type ServiciosParams = {
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

export async function getServicios({
  busqueda = '',
  filtro = 'todos',
  page = 1,
  pageSize = 20,
}: ServiciosParams): Promise<{ items: ServicioListaItem[]; total: number }> {
  const supabase = createClient()
  const termino = busqueda.trim()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('servicios')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (termino) {
    query = query.or(`nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%`)
  }

  if (filtro === 'activos') {
    query = query.eq('activo', true)
  }

  if (filtro === 'nuevos') {
    query = query.gte('created_at', subDays(new Date(), 30).toISOString())
  }

  const { data, error, count } = await query
  if (error) {
    console.error('Error getServicios:', error)
    return { items: [], total: 0 }
  }

  const servicios = (data ?? []) as ServicioRow[]
  if (servicios.length === 0) return { items: [], total: count ?? 0 }

  const ids = servicios.map((s) => s.id)
  const { data: citasData, error: citasError } = await supabase
    .from('citas')
    .select('servicio_id, inicio')
    .in('servicio_id', ids)
    .order('inicio', { ascending: false })

  if (citasError) {
    console.error('Error getServicios citas:', citasError)
  }

  const stats = new Map<string, { total: number; ultima: string | null }>()
  for (const s of servicios) {
    stats.set(s.id, { total: 0, ultima: null })
  }

  for (const cita of citasData ?? []) {
    const current = stats.get(cita.servicio_id)
    if (!current) continue
    current.total += 1
    if (!current.ultima || cita.inicio > current.ultima) {
      current.ultima = cita.inicio
    }
  }

  return {
    items: servicios.map((s) => ({
      ...s,
      totalCitas: stats.get(s.id)?.total ?? 0,
      ultimaCita: stats.get(s.id)?.ultima ?? null,
    })),
    total: count ?? 0,
  }
}

export async function getServicioDetalle(servicioId: string): Promise<{
  servicio: ServicioRow | null
  historial: HistorialServicio[]
}> {
  const supabase = createClient()

  const [{ data: servicio, error: servicioError }, { data: historial, error: historialError }] =
    await Promise.all([
      supabase.from('servicios').select('*').eq('id', servicioId).single(),
      supabase
        .from('citas')
        .select('id, inicio, fin, estado, pacientes(nombre, telefono), profesionales(nombre, especialidad)')
        .eq('servicio_id', servicioId)
        .order('inicio', { ascending: false }),
    ])

  if (servicioError) {
    console.error('Error getServicioDetalle servicio:', servicioError)
  }
  if (historialError) {
    console.error('Error getServicioDetalle historial:', historialError)
  }

  return {
    servicio: (servicio ?? null) as ServicioRow | null,
    historial: (historial ?? []) as unknown as HistorialServicio[],
  }
}

export type ServicioInput = {
  nombre: string
  descripcion?: string
  duracion_minutos: number
  precio: number
  color?: string
  activo?: boolean
}

export async function crearServicio(input: ServicioInput): Promise<ServicioRow | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const supabase = createClient()
  const payload = {
    clinica_id: clinicaId,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || null,
    duracion_minutos: input.duracion_minutos,
    precio: input.precio,
    color: input.color || '#2563EB',
    activo: input.activo ?? true,
  }

  const { data, error } = await supabase.from('servicios').insert(payload).select('*').single()
  if (error) {
    console.error('Error crearServicio:', error)
    return null
  }
  return data as ServicioRow
}

export async function toggleActivoServicio(servicioId: string, activo: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('servicios')
    .update({ activo })
    .eq('id', servicioId)

  if (error) {
    console.error('Error toggleActivoServicio:', error)
    return false
  }
  return true
}

export async function eliminarServicio(servicioId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('servicios')
    .delete()
    .eq('id', servicioId)

  if (error) {
    console.error('Error eliminarServicio:', error)
    return false
  }
  return true
}

export async function actualizarServicio(servicioId: string, input: ServicioInput): Promise<ServicioRow | null> {
  const supabase = createClient()
  const payload = {
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || null,
    duracion_minutos: input.duracion_minutos,
    precio: input.precio,
    color: input.color || '#2563EB',
    activo: input.activo ?? true,
  }

  const { data, error } = await supabase
    .from('servicios')
    .update(payload)
    .eq('id', servicioId)
    .select('*')
    .single()

  if (error) {
    console.error('Error actualizarServicio:', error)
    return null
  }

  return data as ServicioRow
}
