import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/client'

export type ConsentimientoPlantilla = {
  id: string
  clinica_id: string
  servicio_id: string | null
  titulo: string
  contenido: string
  activo: boolean
  created_at: string
  updated_at: string
}

export type ConsentimientoSolicitud = {
  id: string
  clinica_id: string
  cita_id: string
  plantilla_id: string | null
  email_destino: string
  token: string
  estado: 'pendiente' | 'firmado' | 'expirado'
  firma_img: string | null
  firma_ip: string | null
  firmado_at: string | null
  expires_at: string
  created_at: string
}

export const CONSENTIMIENTO_DEFAULT = `CONSENTIMIENTO INFORMADO PARA PROCEDIMIENTOS ESTÉTICOS

Yo, el/la paciente abajo firmante, declaro que:

1. HE SIDO INFORMADO/A del procedimiento que se me realizará, incluyendo su naturaleza, objetivos, riesgos, beneficios y alternativas disponibles.

2. ENTIENDO QUE los procedimientos estéticos conllevan riesgos inherentes como reacciones alérgicas, hematomas, inflamación, infección u otros efectos adversos temporales o permanentes.

3. AUTORIZO al profesional a realizar el procedimiento acordado y los que considere necesarios durante su ejecución.

4. DECLARO que he informado sobre mi estado de salud actual, medicamentos que consume, alergias conocidas y antecedentes médicos relevantes.

5. ENTIENDO que los resultados pueden variar según las características individuales de cada paciente y que no se garantizan resultados específicos.

6. ME COMPROMETO a seguir las indicaciones post-procedimiento y a comunicar cualquier efecto adverso de forma oportuna.

7. CONFIRMO que he tenido la oportunidad de realizar preguntas y que todas han sido respondidas satisfactoriamente.

Al firmar este documento, confirmo que he leído, entendido y acepto las condiciones descritas anteriormente.`

export async function getPlantillas(clinicaId: string): Promise<ConsentimientoPlantilla[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('consentimiento_plantillas')
    .select('*')
    .eq('clinica_id', clinicaId)
    .eq('activo', true)
    .order('created_at', { ascending: false })
  return (data ?? []) as ConsentimientoPlantilla[]
}

export async function getPlantillaPorServicio(
  clinicaId: string,
  servicioId: string | null,
): Promise<ConsentimientoPlantilla | null> {
  const supabase = createClient()
  if (servicioId) {
    const { data } = await supabase
      .from('consentimiento_plantillas')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('servicio_id', servicioId)
      .eq('activo', true)
      .limit(1)
      .maybeSingle()
    if (data) return data as ConsentimientoPlantilla
  }
  const { data } = await supabase
    .from('consentimiento_plantillas')
    .select('*')
    .eq('clinica_id', clinicaId)
    .is('servicio_id', null)
    .eq('activo', true)
    .limit(1)
    .maybeSingle()
  return (data ?? null) as ConsentimientoPlantilla | null
}

export async function upsertPlantilla(
  clinicaId: string,
  data: { id?: string; servicio_id?: string | null; titulo: string; contenido: string },
): Promise<ConsentimientoPlantilla | null> {
  const db = createAdminClient()
  if (data.id) {
    const { data: updated } = await db
      .from('consentimiento_plantillas')
      .update({ titulo: data.titulo, contenido: data.contenido, servicio_id: data.servicio_id ?? null, updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('clinica_id', clinicaId)
      .select()
      .single()
    return (updated ?? null) as ConsentimientoPlantilla | null
  }
  const { data: created } = await db
    .from('consentimiento_plantillas')
    .insert({ clinica_id: clinicaId, titulo: data.titulo, contenido: data.contenido, servicio_id: data.servicio_id ?? null })
    .select()
    .single()
  return (created ?? null) as ConsentimientoPlantilla | null
}

export async function eliminarPlantilla(clinicaId: string, plantillaId: string): Promise<void> {
  const db = createAdminClient()
  await db.from('consentimiento_plantillas').update({ activo: false }).eq('id', plantillaId).eq('clinica_id', clinicaId)
}

export async function getSolicitudesByCita(citaId: string): Promise<ConsentimientoSolicitud[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('consentimiento_solicitudes')
    .select('*')
    .eq('cita_id', citaId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ConsentimientoSolicitud[]
}

export async function getSolicitudByTokenAdmin(token: string): Promise<(ConsentimientoSolicitud & { plantilla: ConsentimientoPlantilla | null; clinica: { nombre: string; logo_url: string | null } | null; cita: { inicio: string; pacientes: { nombre: string } | null; servicios: { nombre: string } | null } | null }) | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('consentimiento_solicitudes')
    .select('*, plantilla:plantilla_id(*), clinica:clinica_id(nombre, logo_url), cita:cita_id(inicio, pacientes(nombre), servicios(nombre))')
    .eq('token', token)
    .single()
  return data as never
}

export async function crearSolicitud(input: {
  clinica_id: string
  cita_id: string
  plantilla_id: string | null
  email_destino: string
}): Promise<ConsentimientoSolicitud> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('consentimiento_solicitudes')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ConsentimientoSolicitud
}

export async function firmarSolicitud(token: string, firma_img: string, firma_ip: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('consentimiento_solicitudes')
    .update({ estado: 'firmado', firma_img, firma_ip, firmado_at: new Date().toISOString() })
    .eq('token', token)
    .eq('estado', 'pendiente')
  if (error) throw new Error(error.message)
}
