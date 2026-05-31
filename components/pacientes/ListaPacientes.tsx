'use client'

import { useEffect, useRef, useState } from 'react'
import { format, isAfter, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Mail, MoreHorizontal, Pencil, Phone, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PacienteListaItem } from '@/lib/pacientes/queries'

type FiltroPacientes = 'todos' | 'activos' | 'nuevos'

type Props = {
  pacientes: PacienteListaItem[]
  total: number
  page: number
  pageSize: number
  filtro: FiltroPacientes
  busqueda: string
  loading?: boolean
  onBusquedaChange: (value: string) => void
  onFiltroChange: (value: FiltroPacientes) => void
  onPageChange: (value: number) => void
  onNuevoPaciente: () => void
  onSelectPaciente: (paciente: PacienteListaItem) => void
  onEditar: (paciente: PacienteListaItem) => void
  onToggleActivo: (paciente: PacienteListaItem) => void
  onEliminar: (paciente: PacienteListaItem) => void
}

function inicialesNombre(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

function estadoPaciente(p: PacienteListaItem): 'nuevo' | 'activo' | 'inactivo' {
  if (!p.activo) return 'inactivo'
  if (isAfter(parseISO(p.created_at), subDays(new Date(), 30))) return 'nuevo'
  return 'activo'
}

function AccionesMenu({
  paciente,
  onEditar,
  onToggleActivo,
  onEliminar,
}: {
  paciente: PacienteListaItem
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
            {paciente.activo
              ? <UserX className="size-3.5 text-amber-400" />
              : <UserCheck className="size-3.5 text-emerald-500" />}
            {paciente.activo ? 'Desactivar' : 'Activar'}
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

export function ListaPacientes({
  pacientes,
  total,
  page,
  pageSize,
  filtro,
  busqueda,
  loading = false,
  onBusquedaChange,
  onFiltroChange,
  onPageChange,
  onNuevoPaciente,
  onSelectPaciente,
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
            placeholder="Buscar por nombre, teléfono o RUT..."
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
          onClick={onNuevoPaciente}
          className="h-8 text-[13px] font-medium text-white border-0"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          + Nuevo paciente
        </Button>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-50">
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Paciente</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Contacto</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Última cita</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total citas</th>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
            <th className="px-5 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-gray-400">
                Cargando pacientes...
              </td>
            </tr>
          ) : pacientes.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-[13px] text-gray-400">
                No hay pacientes para este filtro.
              </td>
            </tr>
          ) : (
            pacientes.map((paciente) => {
              const estado = estadoPaciente(paciente)
              return (
                <tr
                  key={paciente.id}
                  onClick={() => onSelectPaciente(paciente)}
                  className="hover:bg-gray-50/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${paciente.activo ? 'bg-[#2563EB]/10' : 'bg-gray-100'}`}>
                        <span className={`text-[11px] font-semibold ${paciente.activo ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                          {inicialesNombre(paciente.nombre)}
                        </span>
                      </div>
                      <div>
                        <p className={`text-[13px] font-medium ${paciente.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                          {paciente.nombre}
                        </p>
                        {paciente.rut && <p className="text-[11px] text-gray-400">{paciente.rut}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-0.5">
                      {paciente.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3 text-gray-400 shrink-0" />
                          <span className="text-[12px] text-gray-500 truncate max-w-[200px]">{paciente.email}</span>
                        </div>
                      )}
                      {paciente.telefono && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3 text-gray-400 shrink-0" />
                          <span className="text-[12px] text-gray-500">{paciente.telefono}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-600">
                    {paciente.ultimaCita
                      ? format(parseISO(paciente.ultimaCita), 'd MMM, yyyy', { locale: es })
                      : 'Sin citas'}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-gray-900">{paciente.totalCitas}</td>
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
                        paciente={paciente}
                        onEditar={() => onEditar(paciente)}
                        onToggleActivo={() => onToggleActivo(paciente)}
                        onEliminar={() => onEliminar(paciente)}
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
          Mostrando {inicio}–{fin} de {total} pacientes
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
