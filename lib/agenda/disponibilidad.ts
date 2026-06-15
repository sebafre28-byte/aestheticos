import { createClient } from '@/lib/supabase/client'
import { getClinicaConfig } from '@/lib/onboarding/queries'
import type { DisponibilidadRow } from './types'
import { getClinicaId } from './audit'

export const DIA_SEMANA_MAP: Record<string, number> = {
  lunes: 1, martes: 2, 'miércoles': 3, miercoles: 3,
  jueves: 4, viernes: 5, 'sábado': 6, sabado: 6, domingo: 7,
}

export async function getDisponibilidadProfesional(profesionalId: string): Promise<DisponibilidadRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_disponibilidad')
    .select('*')
    .eq('profesional_id', profesionalId)
    .order('dia_semana', { ascending: true })

  if (error) {
    console.error('Error getDisponibilidadProfesional:', error)
    return []
  }

  const filas = (data ?? []) as DisponibilidadRow[]
  if (filas.length > 0) return filas

  const [config, clinicaId] = await Promise.all([getClinicaConfig(), getClinicaId()])
  const horarios = config.horarios ?? {}
  const resultado: DisponibilidadRow[] = []

  for (const [dia, diaDato] of Object.entries(horarios)) {
    const diaSemana = DIA_SEMANA_MAP[dia]
    if (!diaSemana) continue
    resultado.push({
      id: `global-${diaSemana}`,
      clinica_id: clinicaId ?? '',
      profesional_id: profesionalId,
      dia_semana: diaSemana,
      hora_inicio: diaDato.desde,
      hora_fin: diaDato.hasta,
      activo: diaDato.activo,
    })
  }

  return resultado.sort((a, b) => a.dia_semana - b.dia_semana)
}

export async function setDisponibilidadProfesional(
  profesionalId: string,
  disponibilidad: DisponibilidadRow[]
): Promise<boolean> {
  const supabase = createClient()
  const clinicaId = await getClinicaId()
  if (!clinicaId) return false

  const { error: deleteError } = await supabase
    .from('agenda_disponibilidad')
    .delete()
    .eq('profesional_id', profesionalId)

  if (deleteError) {
    console.error('Error setDisponibilidadProfesional delete:', deleteError)
    return false
  }

  const filas = disponibilidad.map((d) => ({
    clinica_id: clinicaId,
    profesional_id: profesionalId,
    dia_semana: d.dia_semana,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    activo: d.activo,
  }))

  if (filas.length === 0) return true

  const { error: insertError } = await supabase.from('agenda_disponibilidad').insert(filas)
  if (insertError) {
    console.error('Error setDisponibilidadProfesional insert:', insertError)
    return false
  }
  return true
}
