import { describe, expect, it } from 'vitest'
import { formatCLP, montoIngresoCobrado, type PagoEstado } from './utils'

const PAGO_ESTADO_LABELS = { pendiente: 'Pendiente', pagado: 'Pagado', parcial: 'Pago parcial' }
const PAGO_METODO_LABELS = { efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito' }

describe('formatCLP', () => {
  it('formats zero correctly', () => {
    expect(formatCLP(0)).toBe('$0')
  })

  it('formats thousands', () => {
    expect(formatCLP(15000)).toMatch(/15\.?000|15,000/)
  })

  it('formats negative', () => {
    expect(formatCLP(-5000)).toContain('5')
  })
})

describe('montoIngresoCobrado', () => {
  it('returns monto when estado is pagado', () => {
    expect(montoIngresoCobrado('pagado', 25000)).toBe(25000)
  })

  it('returns 0 when estado is pendiente', () => {
    expect(montoIngresoCobrado('pendiente', 25000)).toBe(0)
  })

  it('returns monto when estado is parcial', () => {
    expect(montoIngresoCobrado('parcial', 10000)).toBe(10000)
  })
})

describe('PAGO_ESTADO_LABELS', () => {
  it('has all required states', () => {
    expect(PAGO_ESTADO_LABELS.pendiente).toBeTruthy()
    expect(PAGO_ESTADO_LABELS.pagado).toBeTruthy()
    expect(PAGO_ESTADO_LABELS.parcial).toBeTruthy()
  })
})

describe('PAGO_METODO_LABELS', () => {
  it('has all required methods', () => {
    expect(PAGO_METODO_LABELS.efectivo).toBeTruthy()
    expect(PAGO_METODO_LABELS.transferencia).toBeTruthy()
    expect(PAGO_METODO_LABELS.debito).toBeTruthy()
    expect(PAGO_METODO_LABELS.credito).toBeTruthy()
  })
})
