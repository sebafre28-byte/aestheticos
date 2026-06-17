import { createClient } from '@/lib/supabase/client'
import type { ServicioRow } from './types'

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

export async function getServiciosAgenda(includeInactivos = false): Promise<ServicioRow[]> {
  const supabase = createClient()
  let query = supabase.from('servicios').select('*').order('nombre', { ascending: true })
  if (!includeInactivos) query = query.eq('activo', true)
  const { data, error } = await query
  if (error) {
    console.error('Error getServiciosAgenda:', error)
    return []
  }
  return (data ?? []) as ServicioRow[]
}
