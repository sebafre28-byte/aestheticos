import { createClient } from '@/lib/supabase/client'
import type { AuditLogRow } from './types'

export async function getAuditCita(citaId: string): Promise<AuditLogRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agenda_audit_log')
    .select('*')
    .eq('cita_id', citaId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) {
    console.error('Error getAuditCita:', error)
    return []
  }
  return (data ?? []) as AuditLogRow[]
}

export async function crearRecordatorioCita(
  clinicaId: string,
  citaId: string,
  canal: 'whatsapp' | 'email' | 'push',
  minutosAntes: number
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('agenda_recordatorios').insert({
    clinica_id: clinicaId,
    cita_id: citaId,
    canal,
    minutos_antes: minutosAntes,
    activo: true,
  })
  if (error) {
    console.error('Error crearRecordatorioCita:', error)
    return false
  }
  return true
}

export async function getClinicaId(): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('auth_clinica_id')
  if (error) return null
  return (data as string | null) ?? null
}
