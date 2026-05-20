export type PagoEstado = 'pendiente' | 'pagado' | 'parcial'

export function montoIngresoCobrado(pago_estado: PagoEstado, pago_monto: number): number {
  if (pago_estado === 'pagado' || pago_estado === 'parcial') return pago_monto
  return 0
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}
