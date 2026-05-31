'use client'

import { createClient } from '@/lib/supabase/client'

export type WhatsappLogRow = {
  id: string
  clinica_id: string
  cita_id: string | null
  paciente_telefono: string
  tipo_mensaje: string
  estado: 'enviado' | 'fallido' | 'respondido'
  respuesta_paciente: string | null
  created_at: string
}

export type ConversacionResumen = {
  telefono: string
  paciente_nombre: string | null
  ultimo_mensaje_tipo: string
  ultimo_mensaje_estado: string
  ultimo_mensaje_at: string
  total_mensajes: number
  respondio: boolean
  cita_id: string | null
}

export type WhatsappStats = {
  enviados_hoy: number
  tasa_confirmacion: number
  conversaciones_activas: number
  sin_respuesta: number
}

export async function getWhatsappLogs(limite = 50): Promise<WhatsappLogRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) {
    console.error('getWhatsappLogs:', error)
    return []
  }
  return (data ?? []) as WhatsappLogRow[]
}

export async function getConversaciones(): Promise<ConversacionResumen[]> {
  const supabase = createClient()

  // Últimos 30 días
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('whatsapp_logs')
    .select(`
      paciente_telefono,
      tipo_mensaje,
      estado,
      respuesta_paciente,
      created_at,
      cita_id,
      citas ( pacientes ( nombre ) )
    `)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getConversaciones:', error)
    return []
  }

  // Agrupar por teléfono, quedarse con el último mensaje de cada uno
  const porTelefono = new Map<string, ConversacionResumen>()
  for (const log of (data ?? []) as (WhatsappLogRow & { citas?: { pacientes?: { nombre?: string } | { nombre?: string }[] } | null })[]) {
    if (!porTelefono.has(log.paciente_telefono)) {
      const pacientesRaw = (log.citas as { pacientes?: { nombre?: string } | { nombre?: string }[] } | null)?.pacientes
      const nombre = Array.isArray(pacientesRaw)
        ? (pacientesRaw[0]?.nombre ?? null)
        : (pacientesRaw?.nombre ?? null)

      porTelefono.set(log.paciente_telefono, {
        telefono: log.paciente_telefono,
        paciente_nombre: nombre ?? null,
        ultimo_mensaje_tipo: log.tipo_mensaje,
        ultimo_mensaje_estado: log.estado,
        ultimo_mensaje_at: log.created_at,
        total_mensajes: 1,
        respondio: log.estado === 'respondido',
        cita_id: log.cita_id,
      })
    } else {
      const existing = porTelefono.get(log.paciente_telefono)!
      existing.total_mensajes += 1
      if (log.estado === 'respondido') existing.respondio = true
    }
  }

  return Array.from(porTelefono.values())
}

export async function getWhatsappStats(): Promise<WhatsappStats> {
  const supabase = createClient()
  const hoyInicio = new Date()
  hoyInicio.setHours(0, 0, 0, 0)

  const [logsHoy, logsRecientes] = await Promise.all([
    supabase
      .from('whatsapp_logs')
      .select('id, estado', { count: 'exact' })
      .gte('created_at', hoyInicio.toISOString())
      .eq('estado', 'enviado'),
    supabase
      .from('whatsapp_logs')
      .select('paciente_telefono, estado, tipo_mensaje')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in('tipo_mensaje', ['recordatorio_24h', 'recordatorio_2h', 'confirmacion']),
  ])

  const enviados_hoy = logsHoy.count ?? 0

  const logs = (logsRecientes.data ?? []) as { paciente_telefono: string; estado: string; tipo_mensaje: string }[]
  const telefonosContactados = new Set(logs.map((l) => l.paciente_telefono))
  const telefonosRespondieron = new Set(
    logs.filter((l) => l.estado === 'respondido').map((l) => l.paciente_telefono),
  )
  const tasa_confirmacion =
    telefonosContactados.size > 0
      ? Math.round((telefonosRespondieron.size / telefonosContactados.size) * 100)
      : 0

  const ultimos7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: convActivas } = await supabase
    .from('whatsapp_logs')
    .select('paciente_telefono')
    .gte('created_at', ultimos7Dias)
    .eq('estado', 'enviado')

  const telefonosActivos = new Set((convActivas ?? []).map((l: { paciente_telefono: string }) => l.paciente_telefono))
  const telefonosSinRespuesta = new Set(
    logs.filter((l) => l.estado === 'enviado').map((l) => l.paciente_telefono),
  )
  for (const t of telefonosRespondieron) telefonosSinRespuesta.delete(t)

  return {
    enviados_hoy,
    tasa_confirmacion,
    conversaciones_activas: telefonosActivos.size,
    sin_respuesta: telefonosSinRespuesta.size,
  }
}

const TIPO_LABELS: Record<string, string> = {
  recordatorio_24h: 'Recordatorio 24 h',
  recordatorio_2h: 'Recordatorio 2 h',
  confirmacion: 'Confirmación',
  post_cita: 'Post-cita',
  manual: 'Manual',
  notificacion_clinica_cancelacion: 'Notif. cancelación',
}

export function tipoMensajeLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo
}

export function horaRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const dias = Math.floor(hrs / 24)
  return `hace ${dias} d`
}
