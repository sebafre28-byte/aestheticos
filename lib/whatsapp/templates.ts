// Plantillas de mensajes WhatsApp: interpolación de variables para recordatorios y confirmaciones.

export type RecordatorioContext = {
  pacienteNombre: string
  clinicaNombre: string
  servicioNombre: string
  profesionalNombre: string
  /** Fecha/hora local legible */
  inicioLegible: string
}

const PIE_CONFIRMACION =
  '\n\n¿Confirma su asistencia? Responda SI para confirmar o NO para cancelar.'

export function plantillaRecordatorio24h(ctx: RecordatorioContext): string {
  return (
    `Hola ${ctx.pacienteNombre}, le recordamos su cita en ${ctx.clinicaNombre} ` +
    `el ${ctx.inicioLegible} con ${ctx.profesionalNombre} (${ctx.servicioNombre}).` +
    PIE_CONFIRMACION
  )
}

export function plantillaRecordatorio2h(ctx: RecordatorioContext): string {
  return (
    `Hola ${ctx.pacienteNombre}, su cita en ${ctx.clinicaNombre} es en 2 horas ` +
    `(${ctx.inicioLegible}) con ${ctx.profesionalNombre} — ${ctx.servicioNombre}.` +
    PIE_CONFIRMACION
  )
}

export function plantillaConfirmacionManual(ctx: RecordatorioContext): string {
  return (
    `Hola ${ctx.pacienteNombre}, ${ctx.clinicaNombre} confirma su cita ` +
    `el ${ctx.inicioLegible} con ${ctx.profesionalNombre} (${ctx.servicioNombre}).` +
    PIE_CONFIRMACION
  )
}

export function plantillaPostCita(ctx: RecordatorioContext): string {
  return (
    `Hola ${ctx.pacienteNombre}, gracias por visitar ${ctx.clinicaNombre}. ` +
    `Esperamos que haya tenido una buena experiencia con ${ctx.servicioNombre}. ` +
    'Si necesita reagendar, puede contactarnos por este mismo canal.'
  )
}

export function plantillaNotificacionClinicaCancelacion(params: {
  clinicaNombre: string
  pacienteNombre: string
  inicioLegible: string
  servicioNombre: string
}): string {
  return (
    `[${params.clinicaNombre}] El paciente ${params.pacienteNombre} canceló ` +
    `vía WhatsApp la cita del ${params.inicioLegible} (${params.servicioNombre}).`
  )
}
