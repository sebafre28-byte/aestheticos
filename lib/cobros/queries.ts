'use client'

import { createClient } from '@/lib/supabase/client'
import { getClinicaId } from '@/lib/onboarding/queries'

export type PagoEstado = 'pendiente' | 'pagado' | 'parcial'
export type PagoMetodo = 'efectivo' | 'transferencia' | 'debito' | 'credito'

export type PagoCitaFields = {
  pago_monto: number
  pago_estado: PagoEstado
  pago_metodo: PagoMetodo | null
  pago_registrado_at: string | null
}

export type ActualizarPagoInput = {
  pago_estado: PagoEstado
  pago_monto: number
  pago_metodo?: PagoMetodo | null
}

export const PAGO_ESTADO_LABELS: Record<PagoEstado, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  parcial: 'Pago parcial',
}

export const PAGO_METODO_LABELS: Record<PagoMetodo, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}

export { formatCLP, montoIngresoCobrado } from './utils'

export async function actualizarPagoCita(
  citaId: string,
  input: ActualizarPagoInput,
): Promise<PagoCitaFields | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) {
    console.error('actualizarPagoCita: sin sesión activa')
    return null
  }

  const supabase = createClient()

  const monto = Math.max(0, Math.round(input.pago_monto))
  const requiereMetodo = input.pago_estado === 'pagado' || input.pago_estado === 'parcial'

  if (requiereMetodo && !input.pago_metodo) {
    console.error('actualizarPagoCita: método requerido para pago registrado')
    return null
  }

  const payload: PagoCitaFields = {
    pago_monto: monto,
    pago_estado: input.pago_estado,
    pago_metodo: input.pago_estado === 'pendiente' ? null : (input.pago_metodo ?? null),
    pago_registrado_at:
      input.pago_estado === 'pendiente' ? null : new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('citas')
    .update(payload)
    .eq('id', citaId)
    .eq('clinica_id', clinicaId)
    .select('pago_monto, pago_estado, pago_metodo, pago_registrado_at')
    .single()

  if (error) {
    console.error('Error actualizarPagoCita:', error)
    return null
  }

  return data as PagoCitaFields
}
