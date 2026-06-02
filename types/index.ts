// Tipos de dominio de SimpliClinic alineados con el schema de Supabase.
// NOTA: El código activo usa tipos en lib/*/queries.ts (columnas snake_case).
// Estos tipos son referencias de dominio y no se importan directamente en producción.

export type Plan = "starter" | "pro" | "enterprise"

export type Clinica = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  direccion: string | null
  plan: Plan
  logo_url?: string | null
  sitio_web?: string | null
  activo: boolean
  owner_id: string | null
  created_at: string
}

export type Profesional = {
  id: string
  clinica_id: string
  nombre: string
  especialidad: string | null
  email: string | null
  telefono?: string | null
  color: string
  activo: boolean
  created_at: string
}

export type Servicio = {
  id: string
  clinica_id: string
  nombre: string
  duracion_minutos: number
  precio: number
  descripcion?: string | null
  color: string
  activo: boolean
  buffer_minutos: number
  created_at: string
}

export type Paciente = {
  id: string
  clinica_id: string
  nombre: string
  email?: string | null
  telefono: string | null
  rut?: string | null
  fecha_nacimiento?: string | null
  notas?: string | null
  genero?: 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir' | null
  direccion?: string | null
  alergias?: string | null
  condiciones?: string | null
  activo: boolean
  created_at: string
}

export type EstadoCita = "pendiente" | "confirmada" | "completada" | "cancelada" | "no_asistio"

export type PagoEstado = "pendiente" | "pagado" | "parcial"
export type PagoMetodo = "efectivo" | "transferencia" | "debito" | "credito"

export type Cita = {
  id: string
  clinica_id: string
  paciente_id: string
  paciente?: Paciente
  profesional_id: string
  profesional?: Profesional
  servicio_id: string
  servicio?: Servicio
  inicio: string  // ISO UTC timestamptz
  fin: string     // ISO UTC timestamptz
  estado: EstadoCita
  notas?: string | null
  recordatorio_enviado: boolean
  pago_monto: number
  pago_estado: PagoEstado
  pago_metodo?: PagoMetodo | null
  pago_registrado_at?: string | null
  lock_version: number
  recurrence_kind: 'none' | 'daily' | 'weekly' | 'monthly' | 'rrule'
  created_at: string
}

/** Estado de mensaje en mensajes_whatsapp (tabla legacy) */
export type EstadoMensaje = "enviado" | "entregado" | "leido" | "fallido"

/** Tipo de mensaje en mensajes_whatsapp — debe coincidir con el CHECK de la BD */
export type TipoMensaje = "recordatorio" | "confirmacion" | "cancelacion" | "custom"

export type MensajeWhatsApp = {
  id: string
  clinica_id: string
  cita_id?: string | null
  paciente_id: string | null
  contenido: string
  tipo: TipoMensaje
  estado: EstadoMensaje
  created_at: string
}

/** Conversación del inbox de WhatsApp */
export type Conversacion = {
  id: string
  clinica_id: string
  paciente_id?: string | null
  telefono: string
  estado: 'activa' | 'archivada' | 'spam'
  asignado_a?: string | null
  ultimo_mensaje_at: string
  no_leidos: number
  created_at: string
  updated_at: string
}

/** Mensaje dentro de una conversación del inbox */
export type MensajeInbox = {
  id: string
  conversacion_id: string
  clinica_id: string
  direccion: 'entrante' | 'saliente'
  contenido: string
  tipo: 'texto' | 'imagen' | 'audio' | 'documento' | 'plantilla'
  estado_whatsapp: 'pendiente' | 'enviado' | 'entregado' | 'leido' | 'fallido'
  wamid?: string | null
  enviado_por?: string | null
  created_at: string
}

export type MetricaDashboard = {
  label: string
  valor: string | number
  cambio: string
  positivo: boolean
}
