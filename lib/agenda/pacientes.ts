import { createClient } from '@/lib/supabase/client'
import type { PacienteRow } from './types'

export async function getPacientesBusqueda(query: string): Promise<PacienteRow[]> {
  if (!query || query.trim().length < 2) return []
  const supabase = createClient()
  const termino = query.trim()
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .or(`nombre.ilike.%${termino}%,telefono.ilike.%${termino}%,rut.ilike.%${termino}%,email.ilike.%${termino}%`)
    .eq('activo', true)
    .limit(10)
    .order('nombre', { ascending: true })
  if (error) {
    console.error('Error getPacientesBusqueda:', error)
    return []
  }
  return (data ?? []) as PacienteRow[]
}

export async function crearPacienteRapido(
  nombre: string,
  telefono: string,
  clinicaId: string,
  email?: string,
  rut?: string
): Promise<PacienteRow | null> {
  const supabase = createClient()
  const { normalizarRut } = await import('@/lib/utils/rut')
  const insertData: Record<string, string> = { nombre: nombre.trim(), telefono: telefono.trim(), clinica_id: clinicaId }
  if (email?.trim()) insertData.email = email.trim()
  if (rut?.trim()) insertData.rut = normalizarRut(rut.trim())
  const { data, error } = await supabase.from('pacientes').insert(insertData).select().single()
  if (error) {
    console.error('Error crearPacienteRapido:', error)
    return null
  }
  return data as PacienteRow
}
