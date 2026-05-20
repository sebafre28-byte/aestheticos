import { createClient } from '@/lib/supabase/server'

export type ClinicaRow = {
  id: string
  nombre: string
  telefono: string | null
  direccion: string | null
  email: string | null
}

export async function getClinicaActual(): Promise<ClinicaRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clinicas')
    .select('id, nombre, telefono, direccion, email')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('getClinicaActual:', error)
    return null
  }
  return data as ClinicaRow | null
}

export async function needsOnboarding(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const [profesionales, servicios] = await Promise.all([
    supabase.from('profesionales').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('servicios').select('id', { count: 'exact', head: true }).eq('activo', true),
  ])

  const totalProfesionales = profesionales.count ?? 0
  const totalServicios = servicios.count ?? 0
  return totalProfesionales === 0 || totalServicios === 0
}
