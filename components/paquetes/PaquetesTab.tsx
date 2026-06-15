'use client'

import { useEffect, useState } from 'react'
import { Plus, Package, Loader2, X } from 'lucide-react'
import { formatCLP } from '@/lib/cobros/utils'
import {
  getPaquetesVendidos, venderPaquete, getPaquetes,
  type PaqueteVendido, type Paquete,
} from '@/lib/paquetes/queries'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = { pacienteId: string }

export function PaquetesTab({ pacienteId }: Props) {
  const [vendidos, setVendidos] = useState<PaqueteVendido[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVenta, setModalVenta] = useState(false)

  useEffect(() => {
    getPaquetesVendidos(pacienteId, false).then(data => {
      setVendidos(data)
      setLoading(false)
    })
  }, [pacienteId])

  function onVendido(pv: PaqueteVendido) {
    setVendidos(prev => [pv, ...prev])
    setModalVenta(false)
  }

  const activos = vendidos.filter(v => v.activo && v.sesiones_usadas < v.sesiones_total)
  const agotados = vendidos.filter(v => !v.activo || v.sesiones_usadas >= v.sesiones_total)

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-slate-400" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-gray-700">
          {activos.length > 0 ? `${activos.length} paquete${activos.length !== 1 ? 's' : ''} activo${activos.length !== 1 ? 's' : ''}` : 'Sin paquetes activos'}
        </p>
        <button
          onClick={() => setModalVenta(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-3.5" />
          Vender paquete
        </button>
      </div>

      {activos.length === 0 && agotados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
          <Package className="size-7 text-slate-300 mx-auto mb-2" />
          <p className="text-[12px] text-slate-400">Sin paquetes vendidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activos.map(v => <PaqueteVendidoCard key={v.id} pv={v} />)}
          {agotados.length > 0 && activos.length > 0 && (
            <p className="text-[11px] text-slate-400 pt-2 font-medium uppercase tracking-wide">Agotados / inactivos</p>
          )}
          {agotados.map(v => <PaqueteVendidoCard key={v.id} pv={v} agotado />)}
        </div>
      )}

      {modalVenta && (
        <ModalVenta
          pacienteId={pacienteId}
          onClose={() => setModalVenta(false)}
          onVendido={onVendido}
        />
      )}
    </div>
  )
}

function PaqueteVendidoCard({ pv, agotado }: { pv: PaqueteVendido; agotado?: boolean }) {
  const restantes = pv.sesiones_total - pv.sesiones_usadas
  const pct = pv.sesiones_total > 0 ? (pv.sesiones_usadas / pv.sesiones_total) * 100 : 0
  const nombre = pv.paquetes?.nombre ?? 'Paquete'
  const servicio = (pv.paquetes as { servicios?: { nombre: string } | null } | null)?.servicios?.nombre ?? ''

  return (
    <div className={`rounded-xl border p-3.5 ${agotado ? 'border-slate-100 bg-slate-50/50 opacity-60' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate">{nombre}</p>
          {servicio && <p className="text-[11px] text-slate-500">{servicio}</p>}
        </div>
        <span className={`text-[11px] font-semibold shrink-0 ml-2 ${agotado ? 'text-slate-400' : 'text-emerald-600'}`}>
          {agotado ? 'Agotado' : `${restantes} restante${restantes !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 mb-2">
        <div
          className={`h-full rounded-full transition-all ${agotado ? 'bg-slate-300' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{pv.sesiones_usadas} de {pv.sesiones_total} sesiones usadas</span>
        <span>{format(new Date(pv.vendido_at), "dd MMM yyyy", { locale: es })}</span>
      </div>

      {pv.precio_pagado > 0 && (
        <p className="text-[11px] text-slate-400 mt-1">Pagado: {formatCLP(pv.precio_pagado)}</p>
      )}
    </div>
  )
}

function ModalVenta({
  pacienteId,
  onClose,
  onVendido,
}: {
  pacienteId: string
  onClose: () => void
  onVendido: (pv: PaqueteVendido) => void
}) {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [loading, setLoading] = useState(true)
  const [paqueteId, setPaqueteId] = useState('')
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPaquetes(true).then(data => {
      setPaquetes(data)
      if (data[0]) { setPaqueteId(data[0].id); setPrecio(String(data[0].precio)) }
      setLoading(false)
    })
  }, [])

  function onChangePaquete(id: string) {
    setPaqueteId(id)
    const p = paquetes.find(x => x.id === id)
    if (p) setPrecio(String(p.precio))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paqueteId) { setError('Selecciona un paquete'); return }
    const paquete = paquetes.find(p => p.id === paqueteId)
    if (!paquete) return
    setGuardando(true)
    setError(null)
    const pv = await venderPaquete({
      paquete_id: paqueteId,
      paciente_id: pacienteId,
      sesiones_total: paquete.sesiones_total,
      precio_pagado: parseInt(precio) || 0,
      notas: notas.trim() || undefined,
    })
    setGuardando(false)
    if (!pv) { setError('No se pudo registrar la venta'); return }
    onVendido(pv)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[380px] bg-white rounded-2xl shadow-2xl z-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-gray-900">Vender paquete</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="size-4 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
        ) : paquetes.length === 0 ? (
          <p className="text-[13px] text-slate-500 text-center py-4">No hay paquetes activos. Crea uno en Configuración → Paquetes de sesiones.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Paquete</label>
              <select
                value={paqueteId}
                onChange={e => onChangePaquete(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {paquetes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.sesiones_total} ses. · {formatCLP(p.precio)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Precio cobrado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">$</span>
                <input
                  value={precio}
                  onChange={e => setPrecio(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
              <input
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Pago con transferencia"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={guardando} className="flex-1 h-9 rounded-lg bg-[#2563EB] text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {guardando ? <Loader2 className="size-3.5 animate-spin" /> : 'Registrar venta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
