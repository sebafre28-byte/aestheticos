import { createClient } from '@/lib/supabase/client'

export type FichaClinica = {
  id: string
  paciente_id: string
  tipo_tratamiento: string
  contenido: Record<string, unknown>
  notas: string | null
  created_at: string
}

export async function getFichasPaciente(pacienteId: string): Promise<FichaClinica[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('fichas_clinicas')
    .select('id, paciente_id, tipo_tratamiento, contenido, notas, created_at')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function crearFicha(payload: {
  paciente_id: string
  tipo_tratamiento: string
  contenido: Record<string, unknown>
  notas: string | null
}): Promise<FichaClinica | null> {
  const res = await fetch('/api/fichas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return null
  const { data } = await res.json()
  return data ?? null
}

export async function eliminarFicha(id: string): Promise<boolean> {
  const res = await fetch(`/api/fichas/${id}`, { method: 'DELETE' })
  return res.ok
}
