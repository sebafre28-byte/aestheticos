'use client'
import { createPortal } from 'react-dom'
import type { CitaConRelaciones, EstadoCita } from '@/lib/agenda/queries'
import { citaWallClockTime } from '@/lib/agenda/datetime'

type Props = {
  cita: CitaConRelaciones
  x: number
  y: number
}

const ESTADO_BADGE: Record<EstadoCita, { label: string; className: string }> = {
  pendiente:  { label: 'Pendiente',   className: 'bg-amber-100 text-amber-700' },
  confirmada: { label: 'Confirmada',  className: 'bg-teal-100 text-teal-700' },
  en_sala:    { label: 'En sala',     className: 'bg-green-100 text-green-700' },
  completada: { label: 'Completada',  className: 'bg-blue-100 text-blue-700' },
  cancelada:  { label: 'Cancelada',   className: 'bg-red-100 text-red-700' },
  no_asistio: { label: 'No asistió',  className: 'bg-red-100 text-red-700' },
}

export function TooltipCita({ cita, x, y }: Props) {
  const horaInicio = citaWallClockTime(cita.inicio)
  const horaFin = citaWallClockTime(cita.fin)
  const color = cita.profesionales?.color ?? '#2563EB'
  const badge = ESTADO_BADGE[cita.estado]

  const TOOLTIP_WIDTH = 260
  const OFFSET_X = 12
  const left = x + OFFSET_X + TOOLTIP_WIDTH > window.innerWidth
    ? x - TOOLTIP_WIDTH - OFFSET_X
    : x + OFFSET_X

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    top: y - 60,
    zIndex: 9999,
    pointerEvents: 'none',
  }

  return createPortal(
    <div
      style={style}
      className="rounded-xl border border-gray-200 shadow-xl p-3 min-w-[180px] max-w-[240px] bg-white"
    >
      <p className="text-sm font-semibold text-gray-900 truncate">
        {cita.pacientes?.nombre ?? 'Paciente'}
      </p>
      {cita.servicios?.nombre && (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {cita.servicios.nombre}
        </p>
      )}
      {cita.profesionales?.nombre && (
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <p className="text-xs text-gray-600 truncate">{cita.profesionales.nombre}</p>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">
        {horaInicio} – {horaFin}
      </p>
      <span className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    </div>,
    document.body,
  )
}
