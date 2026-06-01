'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getServicioDetalle, type HistorialServicio, type ServicioRow } from '@/lib/servicios/queries'

type Props = {
  servicioId: string
  onClose: () => void
  onEditar: (servicio: ServicioRow) => void
  onToggleActivo?: (servicio: ServicioRow) => void
  onEliminar?: (servicio: ServicioRow) => void
}

export function FichaServicio({ servicioId, onClose, onEditar, onToggleActivo, onEliminar }: Props) {
  const [tab, setTab] = useState<'informacion' | 'historial'>('informacion')
  const [servicio, setServicio] = useState<ServicioRow | null>(null)
  const [historial, setHistorial] = useState<HistorialServicio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getServicioDetalle(servicioId).then((data) => {
      if (!active) return
      setServicio(data.servicio)
      setHistorial(data.historial)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [servicioId])

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [onClose])

  const stats = useMemo(() => {
    return {
      total: historial.length,
      completadas: historial.filter((h) => h.estado === 'completada').length,
      proximas: historial.filter((h) => ['pendiente', 'confirmada'].includes(h.estado)).length,
    }
  }, [historial])

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
        <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 border-l border-gray-100 animate-slide-in-right p-6">
          <p className="text-sm text-gray-500">Cargando ficha del servicio...</p>
        </div>
      </>
    )
  }

  if (!servicio) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 border-l border-gray-100 animate-slide-in-right flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: servicio.color }} />
              <div>
                <p className="text-[15px] font-semibold text-gray-900">{servicio.nombre}</p>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${servicio.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {servicio.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="size-4 text-gray-500" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {(['informacion', 'historial'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`h-7 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
                  tab === key ? 'bg-[#2563EB] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {key === 'informacion' ? 'Información' : 'Historial'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'informacion' && (
            <div className="space-y-4">
              <InfoRow label="Descripción" value={servicio.descripcion || 'Sin descripción'} />
              <InfoRow label="Duración" value={`${servicio.duracion_minutos} minutos`} />
              <InfoRow label="Precio" value={`$${servicio.precio.toLocaleString('es-CL')}`} />
              <InfoRow label="Creación" value={format(parseISO(servicio.created_at), "d 'de' MMMM, yyyy", { locale: es })} />

              <div className="grid grid-cols-3 gap-2 pt-2">
                <StatCard label="Total citas" value={stats.total.toString()} />
                <StatCard label="Completadas" value={stats.completadas.toString()} />
                <StatCard label="Próximas" value={stats.proximas.toString()} />
              </div>
            </div>
          )}

          {tab === 'historial' && (
            <div className="space-y-2">
              {historial.length === 0 ? (
                <p className="text-[13px] text-gray-400">No hay citas para este servicio.</p>
              ) : (
                historial.map((item) => (
                  <article key={item.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900">{item.pacientes?.nombre ?? 'Paciente'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {format(parseISO(item.inicio), "d MMM yyyy '·' HH:mm", { locale: es })}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.profesionales?.nombre ?? 'Profesional'}</p>
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.estado}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <Button variant="outline" onClick={() => onEditar(servicio)} className="w-full">
            Editar servicio
          </Button>
          <div className="flex gap-2">
            {onToggleActivo && (
              <Button
                variant="outline"
                onClick={() => onToggleActivo(servicio)}
                className="flex-1 text-[12px]"
              >
                {servicio.activo
                  ? <><ToggleLeft className="size-3.5 mr-1.5 text-amber-400" />Desactivar</>
                  : <><ToggleRight className="size-3.5 mr-1.5 text-emerald-500" />Activar</>}
              </Button>
            )}
            {onEliminar && (
              <Button
                variant="outline"
                onClick={() => onEliminar(servicio)}
                className="flex-1 text-[12px] text-red-600 hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-[13px] text-gray-700 mt-0.5">{value}</p>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-2 bg-gray-50">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-[16px] font-semibold text-gray-900">{value}</p>
    </div>
  )
}
