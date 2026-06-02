/** Shared types and constants for configurable WhatsApp reminder templates. */

export type RecordatoriosWspConfig = {
  activo: boolean
  minutos_antes: number
  template: string
}

export const TEMPLATE_RECORDATORIO_DEFAULT =
`Hola {nombre} 👋

Te recordamos tu cita en {clinica}:
📅 {fecha} a las {hora}
💆 {servicio} con {profesional}

¿Confirmamos tu asistencia? Responde SÍ para confirmar o NO para cancelar.`
