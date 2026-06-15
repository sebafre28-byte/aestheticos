import { createClient } from '@/lib/supabase/client'
import type { ProfesionalRow } from './types'

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
