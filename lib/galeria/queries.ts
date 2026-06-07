import { createClient } from '@/lib/supabase/client'

export type FotoGaleria = {
  id: string
  paciente_id: string
  cita_id: string | null
  tipo: 'antes' | 'durante' | 'progreso' | 'despues' | 'control'
  descripcion: string | null
  tratamiento: string | null
  foto_url: string | null
  foto_signed: string | null
  fecha_foto: string
  notas: string | null
  created_at: string
}

export async function getGaleriaFotosPaciente(pacienteId: string): Promise<FotoGaleria[]> {
  const res = await fetch(`/api/galeria/fotos?paciente_id=${pacienteId}`)
  if (!res.ok) return []
  const { data } = await res.json()
  return data ?? []
}

export async function subirFotoGaleria(clinicaId: string, pacienteId: string, file: File): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${clinicaId}/${pacienteId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('galeria-clinica').upload(path, file, { upsert: false })
  if (error) return null
  return path
}

export async function eliminarFotoGaleria(id: string): Promise<boolean> {
  const res = await fetch(`/api/galeria/fotos/${id}`, { method: 'DELETE' })
  return res.ok
}
