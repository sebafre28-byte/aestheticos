'use client'

import type { PostgrestError } from '@supabase/supabase-js'

/** Resultado típico de `.select()` en listas; evita que `withRetry` infiera `unknown`. */
export type SupabaseListResult<T> = { data: T[] | null; error: PostgrestError | null }

// ─── Tipos que reflejan exactamente las columnas de Supabase ───────────────────

export type ProfesionalRow = {
  id: string
  clinica_id: string
  nombre: string
  especialidad: string | null
  email: string | null
  telefono: string | null
  color: string
  activo: boolean
  created_at: string
  foto_url?: string | null
  bio?: string | null
  servicios?: string[]
  comision_porcentaje?: number
}

export type PacienteRow = {
  id: string
  clinica_id: string
  nombre: string
  email: string | null
  telefono: string | null
  rut: string | null
  fecha_nacimiento: string | null
  notas: string | null
  activo: boolean
  created_at: string
}

export type ServicioRow = {
  id: string
  clinica_id: string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  precio: number
  color: string
  activo: boolean
  buffer_minutos: number
  created_at: string
}

export type EstadoCita = 'pendiente' | 'confirmada' | 'en_sala' | 'completada' | 'cancelada' | 'no_asistio'
export type PagoEstado = 'pendiente' | 'pagado' | 'parcial'
export type PagoMetodo = 'efectivo' | 'transferencia' | 'debito' | 'credito'

// Cita con joins a paciente, profesional y servicio
export type CitaConRelaciones = {
  id: string
  clinica_id: string
  paciente_id: string
  profesional_id: string
  servicio_id: string
  inicio: string
  fin: string
  estado: EstadoCita
  notas: string | null
  recordatorio_enviado: boolean
  updated_at?: string
  lock_version?: number
  recurrence_kind?: 'none' | 'daily' | 'weekly' | 'monthly' | 'rrule'
  recurrence_rule?: string | null
  recurrence_parent_id?: string | null
  recurrence_instance_date?: string | null
  event_timezone?: string
  pago_monto?: number
  pago_estado?: PagoEstado
  pago_metodo?: PagoMetodo | null
  pago_registrado_at?: string | null
  buffer_minutos?: number
  created_at: string
  pacientes: PacienteRow
  profesionales: ProfesionalRow
  servicios: ServicioRow
  clinicas?: { nombre: string; email?: string | null; telefono?: string | null; direccion?: string | null; logo_url?: string | null } | null
}

export type NuevaCitaData = {
  clinica_id: string
  paciente_id: string
  profesional_id: string
  servicio_id: string
  inicio: string  // ISO string
  fin: string     // ISO string
  notas?: string
  estado?: EstadoCita
  expected_lock_version?: number
  recurrence_kind?: 'none' | 'daily' | 'weekly' | 'monthly' | 'rrule'
  recurrence_rule?: string | null
  recurrence_parent_id?: string | null
  recurrence_instance_date?: string | null
  buffer_minutos?: number
}

export type DisponibilidadRow = {
  id: string
  clinica_id: string
  profesional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  activo: boolean
}

export type BloqueoAgendaRow = {
  id: string
  clinica_id: string
  profesional_id: string | null
  titulo: string
  motivo: string | null
  inicio: string
  fin: string
  tipo: 'bloqueo' | 'vacaciones' | 'feriado' | 'almuerzo' | 'capacitacion'
}

export type AuditLogRow = {
  id: string
  clinica_id: string
  cita_id: string | null
  actor_id: string | null
  accion: string
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  created_at: string
}

export type BloqueoProfesional = {
  id: string
  profesional_id: string | null
  inicio: string
  fin: string
  titulo: string
  tipo?: string
  motivo?: string | null
  profesionales?: { nombre: string; color?: string | null } | null
}
