'use client'

import { useEffect, useState } from 'react'
import { Plus, Package, Pencil, ToggleLeft, ToggleRight, X, Loader2 } from 'lucide-react'
import { formatCLP } from '@/lib/cobros/utils'
import { getPaquetes, crearPaquete, actualizarPaquete, type Paquete } from '@/lib/paquetes/queries'
import { createClient } from '@/lib/supabase/client'

type ServicioBasico = { id: string; nombre: string; precio: number }

export function SeccionPaquetes() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([])
  const [servicios, setServicios] = useState<ServicioBasico[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'crear' | Paquete | null>(null)

  useEffect(() => {
    Promise.all([
      getPaquetes(),
      createClient().from('servicios').select('id, nombre, precio').eq('activo', true).order('nombre'),
    ]).then(([pqs, { data: svcs }]) => {
      setPaquetes(pqs)
      setServicios((svcs ?? []) as ServicioBasico[])
      setLoading(false)
    })
  }, [])

  async function toggleActivo(p: Paquete) {
    await actualizarPaquete(p.id, { activo: !p.activo })
    setPaquetes(prev => prev.map(x => x.id === p.id ? { ...x, activo: !p.activo } : x))
  }

  function onGuardado(p: Paquete) {
    setPaquetes(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next }
      return [p, ...prev]
    })
    setModal(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900">Paquetes de sesiones</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Define paquetes de N sesiones para un servicio a precio especial</p>
        </div>
        <button
          onClick={() => setModal('crear')}
          className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-3.5" />
          Nuevo paquete
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
      ) : paquetes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <Package className="size-8 text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-400">No hay paquetes creados</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Crea tu primer paquete para ofrecer sesiones a precio especial</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {paquetes.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-[13px] font-medium ${p.activo ? 'text-gray-900' : 'text-gray-400'}`}>{p.nombre}</p>
                  {!p.activo && (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">Inactivo</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {p.sesiones_total} sesiones · {p.servicios?.nombre ?? ''} · {formatCLP(p.precio)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setModal(p)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => toggleActivo(p)}
                  className={`p-1.5 rounded-lg transition-colors ${p.activo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  {p.activo ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ModalPaquete
          paqueteExistente={modal === 'crear' ? null : modal}
          servicios={servicios}
          onClose={() => setModal(null)}
          onGuardado={onGuardado}
        />
      )}
    </div>
  )
}

function ModalPaquete({
  paqueteExistente,
  servicios,
  onClose,
  onGuardado,
}: {
  paqueteExistente: Paquete | null
  servicios: ServicioBasico[]
  onClose: () => void
  onGuardado: (p: Paquete) => void
}) {
  const [form, setForm] = useState({
    nombre: paqueteExistente?.nombre ?? '',
    servicio_id: paqueteExistente?.servicio_id ?? (servicios[0]?.id ?? ''),
    sesiones_total: String(paqueteExistente?.sesiones_total ?? '5'),
    precio: String(paqueteExistente?.precio ?? ''),
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const servicioSeleccionado = servicios.find(s => s.id === form.servicio_id)
  const sesiones = parseInt(form.sesiones_total) || 1
  const precioSugerido = servicioSeleccionado ? servicioSeleccionado.precio * sesiones : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (!form.servicio_id) { setError('Selecciona un servicio'); return }
    if (sesiones <= 0) { setError('Las sesiones deben ser mayor a 0'); return }
    const precio = parseInt(form.precio) || 0

    setGuardando(true)
    setError(null)

    if (paqueteExistente) {
      const ok = await actualizarPaquete(paqueteExistente.id, {
        nombre: form.nombre.trim(),
        servicio_id: form.servicio_id,
        sesiones_total: sesiones,
        precio,
      })
      if (!ok) { setError('No se pudo actualizar el paquete'); setGuardando(false); return }
      onGuardado({ ...paqueteExistente, nombre: form.nombre.trim(), servicio_id: form.servicio_id, sesiones_total: sesiones, precio })
    } else {
      const nuevo = await crearPaquete({ nombre: form.nombre.trim(), servicio_id: form.servicio_id, sesiones_total: sesiones, precio })
      if (!nuevo) { setError('No se pudo crear el paquete'); setGuardando(false); return }
      onGuardado(nuevo)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[400px] bg-white rounded-2xl shadow-2xl z-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-gray-900">
            {paqueteExistente ? 'Editar paquete' : 'Nuevo paquete'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="size-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Nombre del paquete</label>
            <input
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Pack 10 sesiones depilación"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Servicio</label>
            <select
              value={form.servicio_id}
              onChange={e => setForm(p => ({ ...p, servicio_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">N° de sesiones</label>
              <input
                value={form.sesiones_total}
                onChange={e => setForm(p => ({ ...p, sesiones_total: e.target.value.replace(/\D/g, '') }))}
                inputMode="numeric"
                placeholder="10"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Precio del paquete</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">$</span>
                <input
                  value={form.precio}
                  onChange={e => setForm(p => ({ ...p, precio: e.target.value.replace(/\D/g, '') }))}
                  inputMode="numeric"
                  placeholder={String(precioSugerido)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {precioSugerido > 0 && !form.precio && (
                <p className="text-[10px] text-slate-400 mt-1">Sin descuento: {formatCLP(precioSugerido)}</p>
              )}
            </div>
          </div>

          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg border border-slate-200 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 h-9 rounded-lg bg-[#2563EB] text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              {guardando ? <Loader2 className="size-3.5 animate-spin" /> : (paqueteExistente ? 'Guardar' : 'Crear paquete')}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
