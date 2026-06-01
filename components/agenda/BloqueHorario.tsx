'use client'
import { useEffect, useRef, useState } from 'react'
import { Lock, Pencil, Trash2, X } from 'lucide-react'
import { citaWallClockTime } from '@/lib/agenda/datetime'
import type { BloqueoProfesional } from '@/lib/agenda/queries'

const TIPO_LABEL: Record<string, string> = {
  bloqueo:      'Bloqueo',
  vacaciones:   'Vacaciones',
  feriado:      'Feriado',
  almuerzo:     'Almuerzo',
  capacitacion: 'Capacitación',
}

type Props = {
  bloqueo: BloqueoProfesional
  topPx: number
  heightPx: number
  onEliminar?: () => void
  onEditar?: () => void
}

export function BloqueHorario({ bloqueo, topPx, heightPx, onEliminar, onEditar }: Props) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const alturaReal = Math.max(heightPx, 20)
  const horaInicio = citaWallClockTime(bloqueo.inicio)
  const horaFin = citaWallClockTime(bloqueo.fin)
  const profesionalNombre = bloqueo.profesionales?.nombre ?? null
  const tipoLabel = TIPO_LABEL[bloqueo.tipo ?? ''] ?? 'Bloqueo'

  return (
    <div
      className="absolute left-0 right-0 z-10 cursor-pointer group"
      style={{
        top: topPx,
        height: alturaReal,
        background: 'repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 4px, #e5e7eb 4px, #e5e7eb 8px)',
        borderLeft: '3px solid #9ca3af',
      }}
      onClick={(e) => { e.stopPropagation(); setOpen(true) }}
    >
      <div className="flex items-center gap-1.5 min-w-0 px-2 h-full">
        <Lock className="size-3 text-gray-400 shrink-0" />
        <span className="text-[11px] font-medium text-gray-500 truncate">{bloqueo.titulo}</span>
      </div>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 w-64"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Lock className="size-3.5 text-gray-400" />
              <span className="text-[13px] font-semibold text-gray-800">{bloqueo.titulo}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="size-4" />
            </button>
          </div>

          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Tipo</span>
              <span className="text-[12px] font-medium text-gray-700">{tipoLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Horario</span>
              <span className="text-[12px] font-medium text-gray-700">{horaInicio} – {horaFin}</span>
            </div>
            {profesionalNombre && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Profesional</span>
                <span className="text-[12px] font-medium text-gray-700">{profesionalNombre}</span>
              </div>
            )}
            {!profesionalNombre && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Profesional</span>
                <span className="text-[12px] text-gray-400 italic">Todos</span>
              </div>
            )}
            {bloqueo.motivo && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-gray-500">Motivo</span>
                <span className="text-[12px] text-gray-700">{bloqueo.motivo}</span>
              </div>
            )}
          </div>

          {(onEditar || onEliminar) && (
            <div className="flex gap-2 px-4 pb-3">
              {onEditar && (
                <button
                  onClick={() => { setOpen(false); onEditar() }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="size-3" /> Editar
                </button>
              )}
              {onEliminar && (
                <button
                  onClick={() => { setOpen(false); onEliminar() }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-red-200 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="size-3" /> Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
