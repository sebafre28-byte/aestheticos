// ─── Types ────────────────────────────────────────────────────────────────────

export type TipoEmail =
  | 'confirmacion_cita'
  | 'nueva_reserva_admin'
  | 'recordatorio_cita'
  | 'cancelacion_cita'

export interface DatosCita {
  paciente_nombre: string
  paciente_telefono?: string
  paciente_email?: string
  servicio_nombre: string
  profesional_nombre: string
  fecha: string          // e.g. "martes 3 de junio"
  hora: string           // e.g. "15:00"
  hora_fin?: string      // e.g. "16:00"
  clinica_nombre: string
  clinica_telefono?: string
  clinica_email?: string
  clinica_direccion?: string
  canal?: 'book' | 'agenda' | 'whatsapp'
}

export interface EmailPayload {
  tipo: TipoEmail
  destinatario: string  // email del destinatario
  datos: DatosCita
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Sends an email via the /api/email route (which uses Resend under the hood).
 * Errors are caught and logged silently — email failure never breaks the main flow.
 *
 * Hook-in points:
 * - Booking page: call after successful `crear_reserva_publica` RPC
 *   (see /app/book/[slug]/page.tsx → PasoDatos.handleSubmit)
 * - Dashboard agenda: call after `crearCita` returns a CitaConRelaciones
 *   (see /lib/agenda/queries.ts → crearCita)
 * - Cancellation: call when cita estado is updated to 'cancelada'
 *   (see /lib/agenda/queries.ts → editarCita / cancelarCita)
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('[sendEmail] Error sending email (non-critical):', err)
  }
}
