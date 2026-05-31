'use client'

import { createClient } from '@/lib/supabase/client'

export type ClinicaBasica = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  direccion: string | null
  plan: string
}

export type PlantillaWsp = {
  id: string
  nombre: string
  texto: string
}

export type RecordatorioConfig = {
  id: string
  activo: boolean
  horasAntes: number
}

export type ClinicaConfiguracion = {
  plantillas?: PlantillaWsp[]
  recordatorios?: RecordatorioConfig[]
}

const PLANTILLAS_DEFAULT: PlantillaWsp[] = [
  { id: 'r24', nombre: 'Recordatorio 24 h', texto: 'Hola {nombre}, te recordamos tu cita en {clinica} el {fecha} a las {hora}. Responde SI para confirmar o NO para cancelar.' },
  { id: 'r2',  nombre: 'Recordatorio 2 h',  texto: 'Hola {nombre}, tu cita en {clinica} es en 2 horas, a las {hora}. ¡Te esperamos!' },
  { id: 'post', nombre: 'Post-cita',         texto: 'Hola {nombre}, gracias por visitarnos en {clinica}. ¿Cómo fue tu experiencia?' },
]

const RECORDATORIOS_DEFAULT: RecordatorioConfig[] = [
  { id: 'r1', activo: true,  horasAntes: 24 },
  { id: 'r2', activo: true,  horasAntes: 2 },
  { id: 'r3', activo: true,  horasAntes: 48 },
  { id: 'r4', activo: false, horasAntes: -1 },
]

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

export async function getClinicaBasica(): Promise<ClinicaBasica | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clinicas')
    .select('id, nombre, email, telefono, direccion, plan')
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
  email?: string
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
      email: input.email?.trim() || null,
      telefono: input.telefono.trim() || null,
      direccion: input.direccion.trim() || null,
    })
    .eq('id', clinicaId)
    .select('id, nombre, email, telefono, direccion, plan')
    .single()

  if (error) {
    console.error('actualizarClinicaBasica:', error)
    return null
  }
  return data as ClinicaBasica
}

export async function getClinicaConfig(): Promise<ClinicaConfiguracion> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return {}

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clinicas')
    .select('configuracion')
    .eq('id', clinicaId)
    .single()

  if (error || !data) return {}
  return (data.configuracion ?? {}) as ClinicaConfiguracion
}

export async function actualizarClinicaConfig(config: ClinicaConfiguracion): Promise<boolean> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return false

  const supabase = createClient()
  const { error } = await supabase
    .from('clinicas')
    .update({ configuracion: config })
    .eq('id', clinicaId)

  if (error) {
    console.error('actualizarClinicaConfig:', error)
    return false
  }
  return true
}

export async function crearProfesional(input: {
  nombre: string
  especialidad?: string
  telefono?: string
  email?: string
  color?: string
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
      telefono: input.telefono?.trim() || null,
      email: input.email?.trim() || null,
      color: input.color || '#2563EB',
      activo: true,
    })
    .select('id, nombre')
    .single()

  if (error) {
    console.error('crearProfesional:', error)
    return null
  }
  return data as { id: string; nombre: string }
}

// kept for onboarding flow
export const crearProfesionalOnboarding = crearProfesional

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

export { PLANTILLAS_DEFAULT, RECORDATORIOS_DEFAULT }
