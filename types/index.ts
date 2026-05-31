export type Plan = "starter" | "pro" | "enterprise"

export type Clinica = {
  id: string
  nombre: string
  email: string
  telefono: string
  direccion: string
  plan: Plan
  logoUrl?: string
  creadoEn: Date
}

export type Profesional = {
  id: string
  clinicaId: string
  nombre: string
  especialidad: string
  email: string
  telefono?: string
  avatarUrl?: string
  activo: boolean
  creadoEn: Date
}

export type Servicio = {
  id: string
  clinicaId: string
  nombre: string
  duracionMinutos: number
  precio: number
  descripcion?: string
  activo: boolean
}

export type Paciente = {
  id: string
  clinicaId: string
  nombre: string
  email?: string
  telefono: string
  fechaNacimiento?: Date
  notas?: string
  avatarUrl?: string
  creadoEn: Date
}

export type EstadoCita = "pendiente" | "confirmada" | "completada" | "cancelada" | "no_asistio"

export type Cita = {
  id: string
  clinicaId: string
  pacienteId: string
  paciente?: Paciente
  profesionalId: string
  profesional?: Profesional
  servicioId: string
  servicio?: Servicio
  fechaHora: Date
  duracionMinutos: number
  estado: EstadoCita
  notas?: string
  recordatorioEnviado: boolean
  creadoEn: Date
}

export type EstadoMensaje = "enviado" | "entregado" | "leido" | "fallido" | "pendiente"

export type TipoMensaje = "recordatorio" | "confirmacion" | "cancelacion" | "personalizado"

export type MensajeWhatsApp = {
  id: string
  clinicaId: string
  citaId?: string
  pacienteId: string
  paciente?: Paciente
  telefono: string
  mensaje: string
  tipo: TipoMensaje
  estado: EstadoMensaje
  enviadoEn?: Date
  creadoEn: Date
}

export type MetricaDashboard = {
  label: string
  valor: string | number
  cambio: string
  positivo: boolean
}
