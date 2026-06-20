// Queries de onboarding: configuración de clínica, horarios y plantillas de WhatsApp.
'use client'

import { createClient } from '@/lib/supabase/client'

export type ClinicaBasica = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  direccion: string | null
  sitio_web: string | null
  logo_url: string | null
  slug: string | null
  tipo: string | null
}

export type HorarioDia = { activo: boolean; desde: string; hasta: string }
export type HorariosConfig = Record<string, HorarioDia>

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

export type { RecordatoriosWspConfig } from '@/lib/whatsapp/recordatorio-config'
export { TEMPLATE_RECORDATORIO_DEFAULT } from '@/lib/whatsapp/recordatorio-config'
import type { RecordatoriosWspConfig } from '@/lib/whatsapp/recordatorio-config'

export type RecordatoriosEmailConfig = {
  manana: boolean         // recordatorio día anterior
  hoy: boolean            // recordatorio mismo día
  hoy_horas_antes: number // 1, 2 o 3 horas antes
  post_cita: boolean      // email post-consulta
}

export const RECORDATORIOS_EMAIL_DEFAULT: RecordatoriosEmailConfig = {
  manana: true,
  hoy: true,
  hoy_horas_antes: 2,
  post_cita: true,
}

export type AgenteWspConfig = {
  activo: boolean
  nombre_asistente?: string
  tono?: 'cercano' | 'formal'
  instrucciones_extra?: string
}

export type WhatsappClinicaConfig = {
  provider?: 'meta' | 'twilio'
  // Meta
  phone_number_id?: string
  access_token?: string
  verify_token?: string
  // Twilio
  account_sid?: string
  auth_token?: string
  from_number?: string
  // Shared
  numero_display?: string
  activo?: boolean
}

export type WizardRolPaso = 'cualquiera' | 'profesional' | 'recepcionista'

export type WizardPasosConfig = {
  activo: boolean
  consentimiento: boolean
  ficha: boolean
  fotos: boolean
  notas: boolean
  rol_paciente: WizardRolPaso
  rol_consentimiento: WizardRolPaso
  rol_ficha: WizardRolPaso
  rol_fotos: WizardRolPaso
  rol_notas: WizardRolPaso
  rol_cierre: WizardRolPaso
}

export const WIZARD_PASOS_DEFAULT: WizardPasosConfig = {
  activo: true,
  consentimiento: true,
  ficha: true,
  fotos: true,
  notas: true,
  rol_paciente: 'recepcionista',
  rol_consentimiento: 'recepcionista',
  rol_ficha: 'profesional',
  rol_fotos: 'profesional',
  rol_notas: 'profesional',
  rol_cierre: 'recepcionista',
}

export type MarketingConfig = {
  cumpleanos?: boolean
  mensaje_cumpleanos?: string
  reactivacion_dias?: 30 | 45 | 60 | 90
  reactivacion_auto?: boolean
  mensaje_reactivacion?: string
}

export type ClinicaConfiguracion = {
  plantillas?: PlantillaWsp[]
  recordatorios?: RecordatorioConfig[]
  horarios?: HorariosConfig
  recordatorios_wsp?: RecordatoriosWspConfig
  recordatorios_email?: RecordatoriosEmailConfig
  agente_wsp?: AgenteWspConfig
  whatsapp_config?: WhatsappClinicaConfig
  wizard_pasos?: WizardPasosConfig
  marketing?: MarketingConfig
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
  const { data, error } = await supabase.rpc('auth_clinica_id')
  if (error) return null
  return (data as string | null) ?? null
}

export async function getClinicaBasica(): Promise<ClinicaBasica | null> {
  const supabase = createClient()
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const { data, error } = await supabase
    .from('clinicas')
    .select('id, nombre, email, telefono, direccion, sitio_web, logo_url, slug')
    .eq('id', clinicaId)
    .single()

  if (error) {
    console.error('getClinicaBasica:', error)
    return null
  }
  return data as ClinicaBasica
}

export async function actualizarClinicaBasica(input: {
  nombre?: string
  email?: string
  telefono?: string
  direccion?: string
  sitio_web?: string
  logo_url?: string
  horarios?: HorariosConfig
  tipo?: string
}): Promise<ClinicaBasica | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let clinicaId = await getClinicaId()

  // Si no existe la clínica (trigger falló), crearla ahora
  if (!clinicaId) {
    const { data: nueva, error: insertError } = await supabase
      .from('clinicas')
      .insert({ owner_id: user.id, nombre: input.nombre?.trim() ?? 'Mi Clínica', email: user.email })
      .select('id')
      .single()
    if (insertError || !nueva) {
      console.error('actualizarClinicaBasica create:', insertError)
      return null
    }
    clinicaId = nueva.id
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (input.nombre    !== undefined) updates.nombre    = input.nombre.trim()
  if (input.email     !== undefined) updates.email     = input.email?.trim() || null
  if (input.telefono  !== undefined) updates.telefono  = input.telefono?.trim() || null
  if (input.direccion !== undefined) updates.direccion = input.direccion?.trim() || null
  if (input.sitio_web !== undefined) updates.sitio_web = input.sitio_web?.trim() || null
  if (input.logo_url  !== undefined) updates.logo_url  = input.logo_url?.trim() || null

  if (input.horarios !== undefined) {
    // Merge horarios into existing configuracion JSON
    const { data: existing } = await supabase
      .from('clinicas')
      .select('configuracion')
      .eq('id', clinicaId)
      .single()
    const configActual = (existing?.configuracion as ClinicaConfiguracion) ?? {}
    updates.configuracion = { ...configActual, horarios: input.horarios }
  }

  const { data, error } = await supabase
    .from('clinicas')
    .update(updates)
    .eq('id', clinicaId)
    .select('id, nombre, email, telefono, direccion, sitio_web, logo_url, slug')
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
  descripcion?: string
}): Promise<{ id: string; nombre: string } | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return null

  const supabase = createClient()
  const { data, error } = await supabase
    .from('servicios')
    .insert({
      clinica_id: clinicaId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
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

export async function marcarOnboardingCompletado(): Promise<void> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return
  const supabase = createClient()
  await supabase.from('clinicas').update({ onboarding_completado: true }).eq('id', clinicaId)
}

export async function getWhatsappClinicaConfig(): Promise<WhatsappClinicaConfig> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return {}

  const supabase = createClient()
  const { data, error } = await supabase
    .from('clinicas')
    .select('whatsapp_config')
    .eq('id', clinicaId)
    .single()

  if (error || !data) return {}
  return (data.whatsapp_config ?? {}) as WhatsappClinicaConfig
}

export async function guardarWhatsappConfig(config: WhatsappClinicaConfig): Promise<boolean> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return false

  const supabase = createClient()

  // Merge with existing config
  const { data: existing } = await supabase
    .from('clinicas')
    .select('whatsapp_config')
    .eq('id', clinicaId)
    .single()

  const current = (existing?.whatsapp_config ?? {}) as WhatsappClinicaConfig
  const merged = { ...current, ...config }

  const { error } = await supabase
    .from('clinicas')
    .update({ whatsapp_config: merged })
    .eq('id', clinicaId)

  if (error) {
    console.error('guardarWhatsappConfig:', error)
    return false
  }
  return true
}
