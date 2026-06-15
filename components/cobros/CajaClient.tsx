'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Banknote, CreditCard, Building2, Smartphone, CheckCircle2, Clock, TrendingUp, Users } from 'lucide-react'
import { formatCLP } from '@/lib/cobros/utils'
import type { ResumenCaja, ComisionProfesional } from '@/lib/cobros/caja'

type Historial = { id: string; fecha: string; total: number; efectivo: number; transferencia: number; debito: number; credito: number; created_at: string }

type Props = {
  resumenHoy: ResumenCaja
  historial: Historial[]
  comisiones: ComisionProfesional[]
  mesLabel: string
}

const METODO_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote className="size-4 text-emerald-600" />,
  transferencia: <Building2 className="size-4 text-blue-600" />,
  debito: <Smartphone className="size-4 text-purple-600" />,
  credito: <CreditCard className="size-4 text-orange-500" />,
}

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}

export function CajaClient({ resumenHoy, historial, comisiones, mesLabel }: Props) {
  const [cerrando, setCerrando] = useState(false)
  const [cerradoOk, setCerradoOk] = useState(resumenHoy.yaCerrado)
  const [errorCierre, setErrorCierre] = useState<string | null>(null)

  const metodos = [
    { key: 'efectivo', val: resumenHoy.efectivo },
    { key: 'transferencia', val: resumenHoy.transferencia },
    { key: 'debito', val: resumenHoy.debito },
    { key: 'credito', val: resumenHoy.credito },
  ].filter(m => m.val > 0)

  async function cerrarCaja() {
    setCerrando(true)
    setErrorCierre(null)
    try {
      const res = await fetch('/api/caja/cerrar', { method: 'POST' })
      if (!res.ok) throw new Error('Error al cerrar caja')
      setCerradoOk(true)
    } catch {
      setErrorCierre('No se pudo cerrar la caja. Intenta de nuevo.')
    } finally {
      setCerrando(false)
    }
  }

  const totalComisiones = comisiones.reduce((s, c) => s + c.comision_total, 0)

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full bg-slate-50">
      <div>
        <h1 className="text-[22px] font-bold text-[#0B132B] leading-tight">Caja y Comisiones</h1>
        <p className="text-[13px] text-slate-500 mt-0.5 capitalize">{format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}</p>
      </div>

      {/* Cierre del día */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" />
            <h2 className="text-[14px] font-semibold text-[#0B132B]">Cierre de hoy</h2>
          </div>
          {cerradoOk ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" /> Cerrado
            </span>
          ) : (
            <button
              onClick={cerrarCaja}
              disabled={cerrando || resumenHoy.total === 0}
              className="rounded-lg bg-[#0B132B] px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {cerrando ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          )}
        </div>

        {errorCierre && (
          <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{errorCierre}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="col-span-2 sm:col-span-1 rounded-xl bg-[#0B132B] p-4 text-white">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Total del día</p>
            <p className="text-[22px] font-bold mt-1">{formatCLP(resumenHoy.total)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{resumenHoy.citas} cobro{resumenHoy.citas !== 1 ? 's' : ''}</p>
          </div>
          {metodos.map(m => (
            <div key={m.key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                {METODO_ICONS[m.key]}
                <p className="text-[11px] font-medium text-slate-500">{METODO_LABELS[m.key]}</p>
              </div>
              <p className="text-[16px] font-bold text-[#0B132B]">{formatCLP(m.val)}</p>
            </div>
          ))}
          {metodos.length === 0 && (
            <div className="col-span-3 flex items-center justify-center py-6 text-[13px] text-slate-400">
              Sin cobros registrados hoy
            </div>
          )}
        </div>
      </div>

      {/* Comisiones del mes */}
      {comisiones.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-slate-400" />
              <h2 className="text-[14px] font-semibold text-[#0B132B]">
                Comisiones del mes
                <span className="ml-2 text-[12px] font-normal text-slate-400 capitalize">{mesLabel}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Total a pagar</p>
              <p className="text-[16px] font-bold text-[#0B132B]">{formatCLP(totalComisiones)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Profesional</th>
                  <th className="text-center py-2 pr-3 text-slate-400 font-medium">Comisión</th>
                  <th className="text-center py-2 pr-3 text-slate-400 font-medium">Citas</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-medium">Monto cobrado</th>
                  <th className="text-right py-2 text-slate-400 font-medium">A pagar</th>
                </tr>
              </thead>
              <tbody>
                {comisiones.map(c => (
                  <tr key={c.profesional_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3 font-medium text-[#0B132B]">{c.nombre}</td>
                    <td className="py-2.5 pr-3 text-center text-slate-600">{c.comision_porcentaje}%</td>
                    <td className="py-2.5 pr-3 text-center text-slate-600">{c.citas_cobradas}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{formatCLP(c.monto_cobrado)}</td>
                    <td className="py-2.5 text-right font-semibold text-[#0B132B]">{formatCLP(c.comision_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de cierres */}
      {historial.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4 text-slate-400" />
            <h2 className="text-[14px] font-semibold text-[#0B132B]">Historial de cierres</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Fecha</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-medium">Efectivo</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-medium">Transferencia</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-medium">Débito</th>
                  <th className="text-right py-2 pr-3 text-slate-400 font-medium">Crédito</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(h => (
                  <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3 text-[#0B132B] font-medium">
                      {format(new Date(h.fecha + 'T12:00:00'), "dd/MM/yyyy")}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{h.efectivo > 0 ? formatCLP(h.efectivo) : '—'}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{h.transferencia > 0 ? formatCLP(h.transferencia) : '—'}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{h.debito > 0 ? formatCLP(h.debito) : '—'}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{h.credito > 0 ? formatCLP(h.credito) : '—'}</td>
                    <td className="py-2.5 text-right font-semibold text-[#0B132B]">{formatCLP(h.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
