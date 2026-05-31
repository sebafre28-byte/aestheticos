'use client'

import { useEffect, useRef, useState } from 'react'
import { format, isAfter, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { MoreHorizontal, Pencil, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ServicioListaItem } from '@/lib/servicios/queries'

type FiltroServicios = 'todos' | 'activos' | 'nuevos'

type Props = {
  servicios: ServicioListaItem[]
  total: number
  page: number
  pageSize: number
  filtro: FiltroServicios
  busqueda: string
  loading?: boolean
  onBusquedaChange: (value: string) => void
  onFiltroChange: (value: FiltroServicios) => void
  onPageChange: (value: number) => void
  onNuevoServicio: () => void
  onSelectServicio: (servicio: ServicioListaItem) => void
  onEditar: (servicio: ServicioListaItem) => void
  onToggleActivo: (servicio: ServicioListaItem) => void
  onEliminar: (servicio: ServicioListaItem) => void
}

function estadoServicio(s: ServicioListaItem): 'nuevo' | 'activo' | 'inactivo' {
  if (!s.activo) return 'inactivo'
  if (isAfter(parseISO(s.created_at), subDays(new Date(), 30))) return 'nuevo'
  return 'activo'
}

function AccionesMenu({
  servicio,
  onEditar,
  onToggleActivo,
  onEliminar,
}: {
  servicio: ServicioListaItem
  onEditar: () => void
  onToggleActivo: () => void
  onEliminar: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 text-[13px]">
          <button
            onClick={() => { setOpen(false); onEditar() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="size-3.5 text-gray-400" />
            Editar
          </button>
          <button
            onClick={() => { setOpen(false); onToggleActivo() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            {servicio.activo
              ? <ToggleLeft className="size-3.5 text-amber-400" />
              : <ToggleRight className="size-3.5 text-emerald-500" />}
            {servicio.activo ? 'Desactivar' : 'Activar'}
          </button>
          <div className="my-1 border-t border-gray-50" />
          <button
            onClick={() => { setOpen(false); onEliminar() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

export function ListaServicios({
  servicios,
  total,
  page,
  pageSize,
  filtro,
  busqueda,
  loading = false,
  onBusquedaChange,
  onFiltroChange,
  onPageChange,
  onNuevoServicio,
  onSelectServicio,
  onEditar,
  onToggleActivo,
  onEliminar,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const inicio = total === 0 ? 0 : (page - 1) * pageSize + 1
  const fin = Math.min(page * pageSize, total)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <Input
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar servicio por nombre o descripción..."
            className="h-8 pl-8 text-[13px] bg-gray-50/70 border-gray-200"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {([
            { key: 'todos', label: 'Todos' },
            { key: 'activos', label: 'Activos' },
            { key: 'nuevos', label: 'Nuevos' },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => onFiltroChange(item.key)}
              className={`h-7 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                filtro === item.key
                  ? 'bg-[#2563EB] text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button
          onClick={onNuevoServicio}
          className="h-8 text-[13px] font-medium text-white border-0"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          + Nuevo servicio
        </Button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-50">
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Servicio</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Duración</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Precio</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Última cita</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total citas</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
            <th className="px-5 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-[13px] text-gray-400">
                Cargando servicios...
              </td>
            </tr>
          ) : servicios.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-8 text-center text-[13px] text-gray-400">
                No hay servicios para este filtro.
              </td>
            </tr>
          ) : (
            servicios.map((servicio) => {
              const estado = estadoServicio(servicio)
              return (
                <tr
                  key={servicio.id}
                  onClick={() => onSelectServicio(servicio)}
                  className="hover:bg-gray-50/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-[13px] font-semibold"
                        style={{ backgroundColor: servicio.activo ? servicio.color : '#D1D5DB' }}
                      >
                        {servicio.nombre.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className={`text-[13px] font-medium ${servicio.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                          {servicio.nombre}
                        </p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{servicio.descripcion || 'Sin descripción'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600">{servicio.duracion_minutos} min</td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">
                    ${servicio.precio.toLocaleString('es-CL')}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600">
                    {servicio.ultimaCita
                      ? format(parseISO(servicio.ultimaCita), 'd MMM, yyyy', { locale: es })
                      : 'Sin citas'}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{servicio.totalCitas}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        estado === 'activo'
                          ? 'bg-emerald-50 text-emerald-600'
                          : estado === 'nuevo'
                          ? 'bg-cyan-50 text-cyan-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {estado === 'activo' ? 'Activo' : estado === 'nuevo' ? 'Nuevo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <AccionesMenu
                        servicio={servicio}
                        onEditar={() => onEditar(servicio)}
                        onToggleActivo={() => onToggleActivo(servicio)}
                        onEliminar={() => onEliminar(servicio)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[12px] text-gray-400">
          Mostrando {inicio}–{fin} de {total} servicios
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-7 px-2.5 rounded-lg text-[12px] text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors border border-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Anterior
          </button>
          <span className="h-7 px-2.5 rounded-lg text-[12px] bg-[#2563EB] text-white font-medium inline-flex items-center">
            {page}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="h-7 px-2.5 rounded-lg text-[12px] text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors border border-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
