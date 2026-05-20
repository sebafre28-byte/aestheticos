'use client'

import { createClient } from '@/lib/supabase/client'

export type ClinicaBasica = {
  id: string
  nombre: string
  telefono: string | null
  direccion: string | null
}

export async function getClinicaId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clinicas')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (error) return null
  return data?.id ?? null
}

export async function getClinicaBasica(): Promise<ClinicaBasica | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clinicas')
    .select('id, nombre, telefono, direccion')
    .eq('owner_id', user.id)
    .single()

  if (error) {
    console.error('getClinicaBasica:', error)
    return null
  }
  return data as ClinicaBasica
}

export async function actualizarClinicaBasica(input: {
  nombre: string
  telefono: string
  direccion: string
}): Promise<ClinicaBasica | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clinicas')
    .update({
      nombre: input.nombre.trim(),
      telefono: input.telefono.trim() || null,
      direccion: input.direccion.trim() || null,
    })
    .eq('id', clinicaId)
    .select('id, nombre, telefono, direccion')
    .single()

  if (error) {
    console.error('actualizarClinicaBasica:', error)
    return null
  }
  return data as ClinicaBasica
}

export async function crearProfesionalOnboarding(input: {
  nombre: string
  especialidad?: string
}): Promise<{ id: string; nombre: string } | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('profesionales')
    .insert({
      clinica_id: clinicaId,
      nombre: input.nombre.trim(),
      especialidad: input.especialidad?.trim() || null,
      color: '#2563EB',
      activo: true,
    })
    .select('id, nombre')
    .single()

  if (error) {
    console.error('crearProfesionalOnboarding:', error)
    return null
  }
  return data as { id: string; nombre: string }
}

export async function crearServicioOnboarding(input: {
  nombre: string
  duracion_minutos: number
  precio: number
}): Promise<{ id: string; nombre: string } | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('servicios')
    .insert({
      clinica_id: clinicaId,
      nombre: input.nombre.trim(),
      duracion_minutos: input.duracion_minutos,
      precio: Math.max(0, Math.round(input.precio)),
      color: '#14B8A6',
      activo: true,
    })
    .select('id, nombre')
    .single()

  if (error) {
    console.error('crearServicioOnboarding:', error)
    return null
  }
  return data as { id: string; nombre: string }
}

export async function getOnboardingCounts(): Promise<{
  profesionales: number
  servicios: number
}> {
  const supabase = createClient()
  const [profesionales, servicios] = await Promise.all([
    supabase.from('profesionales').select('id', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('servicios').select('id', { count: 'exact', head: true }).eq('activo', true),
  ])
  return {
    profesionales: profesionales.count ?? 0,
    servicios: servicios.count ?? 0,
  }
}
