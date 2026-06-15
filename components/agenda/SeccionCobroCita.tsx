'use client'

import { useState } from 'react'
import { Banknote, CheckCircle2, Clock, Loader2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CitaConRelaciones } from '@/lib/agenda/queries'
import {
  PAGO_ESTADO_LABELS,
  PAGO_METODO_LABELS,
  actualizarPagoCita,
  formatCLP,
  type PagoCitaFields,
  type PagoEstado,
  type PagoMetodo,
} from '@/lib/cobros/queries'

const estadoBtnClass: Record<PagoEstado, string> = {
  pendiente: 'border-amber-200 bg-amber-50 text-amber-800 ring-amber-400',
  pagado: 'border-teal-200 bg-teal-50 text-teal-800 ring-[#14B8A6]',
  parcial: 'border-blue-200 bg-blue-50 text-blue-800 ring-[#2563EB]',
}

type Props = {
  cita: CitaConRelaciones
  onPagoActualizado: (citaId: string, pago: PagoCitaFields) => void
}

export function SeccionCobroCita({ cita, onPagoActualizado }: Props) {
  const precioServicio = cita.servicios?.precio ?? 0
  const comisionPct = cita.profesionales?.comision_porcentaje ?? 0
  const [estado, setEstado] = useState<PagoEstado>((cita.pago_estado ?? 'pendiente') as PagoEstado)
  const [monto, setMonto] = useState(String(cita.pago_monto ?? precioServicio))
  const [metodo, setMetodo] = useState<PagoMetodo | ''>((cita.pago_metodo as PagoMetodo) ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const montoNum = Math.max(0, parseInt(monto.replace(/\D/g, ''), 10) || 0)
  const requiereCobro = estado === 'pagado' || estado === 'parcial'
  const comisionMonto = requiereCobro && comisionPct > 0 ? Math.round(montoNum * comisionPct / 100) : 0

  function seleccionarEstado(nuevo: PagoEstado) {
    setEstado(nuevo)
    setError(null)
    if (nuevo === 'pagado') setMonto(String(precioServicio))
    if (nuevo === 'pendiente') setMetodo('')
  }

  async function guardar() {
    setError(null)
    if (requiereCobro && !metodo) {
      setError('Selecciona un método de pago')
      return
    }
    if (requiereCobro && montoNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (estado === 'parcial' && precioServicio > 0 && montoNum >= precioServicio) {
      setError('Para pago parcial el monto debe ser menor al precio del servicio')
      return
    }

    setGuardando(true)
    const resultado = await actualizarPagoCita(cita.id, {
      pago_estado: estado,
      pago_monto: requiereCobro ? montoNum : precioServicio,
      pago_metodo: requiereCobro ? (metodo as PagoMetodo) : null,
      comision_monto: comisionMonto,
    })
    setGuardando(false)

    if (!resultado) {
      setError('No se pudo guardar el cobro. Intenta de nuevo.')
      return
    }

    onPagoActualizado(cita.id, resultado)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  return (
    <div className="px-5 py-4 border-b border-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="size-3.5 text-[#14B8A6]" />
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Cobro</p>
      </div>

      {precioServicio > 0 && (
        <p className="text-[12px] text-gray-500 mb-3">
          Precio del servicio:{' '}
          <span className="font-semibold text-gray-800">{formatCLP(precioServicio)}</span>
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['pendiente', 'pagado', 'parcial'] as PagoEstado[]).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => seleccionarEstado(e)}
            className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition-all ${
              estado === e ? `ring-2 ${estadoBtnClass[e]}` : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {e === 'pendiente' && <Clock className="size-3.5 mx-auto mb-1" />}
            {e === 'pagado' && <CheckCircle2 className="size-3.5 mx-auto mb-1" />}
            {e === 'parcial' && <Banknote className="size-3.5 mx-auto mb-1" />}
            {PAGO_ESTADO_LABELS[e]}
          </button>
        ))}
      </div>

      {requiereCobro && (
        <div className="space-y-3 mb-4">
          <div className="space-y-1.5">
            <Label htmlFor="pago-monto" className="text-[12px] text-gray-600">
              {estado === 'parcial' ? 'Monto abonado' : 'Monto cobrado'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">$</span>
              <Input
                id="pago-monto"
                inputMode="numeric"
                value={monto}
                onChange={(ev) => setMonto(ev.target.value.replace(/[^\d]/g, ''))}
                className="pl-7 h-10 text-[14px]"
                placeholder="0"
              />
            </div>
          </div>

          {comisionPct > 0 && montoNum > 0 && (
            <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              Comisión {comisionPct}%: <span className="font-semibold text-slate-700">{formatCLP(comisionMonto)}</span>
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-[12px] text-gray-600">Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PAGO_METODO_LABELS) as PagoMetodo[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodo(m)}
                  className={`h-9 rounded-lg border text-[11px] font-medium transition-colors ${
                    metodo === m
                      ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {PAGO_METODO_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <Button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="w-full h-9 text-[12px] font-medium text-white border-0"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
      >
        {guardando ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : guardado ? (
          '¡Cobro guardado!'
        ) : (
          'Registrar cobro'
        )}
      </Button>

      {cita.pago_registrado_at && estado !== 'pendiente' && (
        <p className="text-[10px] text-gray-400 mt-2 text-center">
          Último registro: {new Date(cita.pago_registrado_at).toLocaleString('es-CL')}
        </p>
      )}
    </div>
  )
}