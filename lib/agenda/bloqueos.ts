import { createClient } from '@/lib/supabase/client'
import type { BloqueoProfesional } from './types'

export async function getBloqueos(fecha: string): Promise<BloqueoProfesional[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('agenda_bloqueos')
    .select('id, profesional_id, inicio, fin, titulo, tipo, motivo, profesionales(nombre, color)')
    .lt('inicio', `${fecha}T23:59:59`)
    .gt('fin', `${fecha}T00:00:00`)
  return (data ?? []) as unknown as BloqueoProfesional[]
}

export async function getBloqueosRango(
  fechaInicioIso: string,
  fechaFinIso: string
): Promise<BloqueoProfesional[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_bloqueos')
    .select('id, profesional_id, inicio, fin, titulo, tipo, motivo, profesionales(nombre, color)')
    .lt('inicio', fechaFinIso)
    .gt('fin', fechaInicioIso)
    .order('inicio', { ascending: true })
  if (error) {
    console.error('Error getBloqueosRango:', error)
    return []
  }
  return (data ?? []) as unknown as BloqueoProfesional[]
}

export async function crearBloqueo(data: {
  clinica_id: string
  profesional_id?: string
  titulo: string
  tipo: 'bloqueo' | 'vacaciones' | 'feriado' | 'almuerzo' | 'capacitacion'
  inicio: string
  fin: string
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
