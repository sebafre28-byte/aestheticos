'use client'

import { useState } from 'react'
import { Clock, CheckCircle, CheckCircle2, XCircle, UserX, DollarSign } from 'lucide-react'
import { citaWallClockTime } from '@/lib/agenda/datetime'
import type { CitaConRelaciones, EstadoCita } from '@/lib/agenda/queries'
import { TooltipCita } from './TooltipCita'

export const PIXEL_POR_MIN = 1.5
export const HORA_GRILLA_INICIO = 8

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Ícono pequeño por estado (esquina del bloque)
const ESTADO_ICONO: Record<EstadoCita, React.ComponentType<{ className?: string }>> = {
  pendiente:  Clock,
  confirmada: CheckCircle,
  completada: CheckCircle2,
  cancelada:  XCircle,
  no_asistio: UserX,
}

// Color del ícono de estado
const ESTADO_ICONO_COLOR: Record<EstadoCita, string> = {
  pendiente:  '#D97706',
  confirmada: '#0D9488',
  completada: '#2563EB',
  cancelada:  '#DC2626',
  no_asistio: '#991B1B',
}

// Borde izquierdo según estado
const ESTADO_BORDE: Record<EstadoCita, { color: string; style: 'solid' | 'dashed' }> = {
  pendiente:  { color: '#F59E0B', style: 'dashed' },
  confirmada: { color: '#14B8A6', style: 'solid' },
  completada: { color: '#3B82F6', style: 'solid' },
  cancelada:  { color: '#EF4444', style: 'solid' },
  no_asistio: { color: '#991B1B', style: 'solid' },
}

type Props = {
  cita: CitaConRelaciones
  onClick: (cita: CitaConRelaciones) => void
  onDragStart?: (cita: CitaConRelaciones) => void
  onResize?: (cita: CitaConRelaciones, deltaMinutos: number) => void
  topPx: number
  heightPx: number
  leftPercent?: number
  widthPercent?: number
  bufferPx?: number
}

export function BloqueCita({
  cita,
  onClick,
  onDragStart,
  onResize,
  topPx,
  heightPx,
  leftPercent = 0,
  widthPercent = 100,
  bufferPx = 0,
}: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const color = cita.profesionales?.color ?? '#2563EB'
  const horaInicio = citaWallClockTime(cita.inicio)
  const horaFin = citaWallClockTime(cita.fin)
  const nombrePaciente = cita.pacientes?.nombre ?? 'Paciente'
  const nombreServicio = cita.servicios?.nombre ?? ''

  const esCancelada = cita.estado === 'cancelada'
  const esNoAsistio = cita.estado === 'no_asistio'
  const esPendiente = cita.estado === 'pendiente'

  const alturaReal = Math.max(heightPx, 20)
  const borde = ESTADO_BORDE[cita.estado]
  const IconoEstado = ESTADO_ICONO[cita.estado]
  const iconColor = ESTADO_ICONO_COLOR[cita.estado]

  // Fondo: rojo tenue si no asistió, color profesional al 12% para el resto
  const bgColor = esNoAsistio
    ? 'rgba(254, 226, 226, 0.85)'
    : hexToRgba(color, 0.12)

  const estiloBloque: React.CSSProperties = {
    top: topPx,
    height: alturaReal,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    backgroundColor: bgColor,
    opacity: esCancelada ? 0.5 : 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderTopStyle: 'solid',
    borderRightStyle: 'solid',
    borderBottomStyle: 'solid',
    borderLeftStyle: borde.style,
    borderTopColor: hexToRgba(color, 0.2),
    borderRightColor: hexToRgba(color, 0.2),
    borderBottomColor: hexToRgba(color, 0.2),
    borderLeftColor: borde.color,
  }


  function iniciarResize(event: React.MouseEvent<HTMLButtonElement>) {
    if (onResize == null) return
    const handleResize: (c: CitaConRelaciones, deltaMinutos: number) => void = onResize
    event.stopPropagation()
    const yInicio = event.clientY

    function onMove(e: MouseEvent) {
      const diffPx = e.clientY - yInicio
      const diffMin = Math.round((diffPx / PIXEL_POR_MIN) / 15) * 15
      handleResize(cita, diffMin)
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <>
    {bufferPx > 0 && (
      <div
        className="absolute pointer-events-none rounded-b-md"
        style={{
          top: topPx + alturaReal,
          height: bufferPx,
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          backgroundColor: 'rgba(251, 146, 60, 0.12)',
          borderLeft: '3px solid rgba(251, 146, 60, 0.25)',
          borderRight: '1px solid rgba(251, 146, 60, 0.15)',
          borderBottom: '1px solid rgba(251, 146, 60, 0.15)',
        }}
      />
    )}
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(cita)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(cita)}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/cita-id', cita.id)
        onDragStart?.(cita)
      }}
      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltip(null)}
      className="absolute rounded-md cursor-pointer transition-all hover:brightness-95 select-none overflow-hidden"
      style={estiloBloque}
    >
      {/* Ícono de estado — esquina superior derecha */}
      <div
        className="absolute top-0.5 right-0.5 z-10 pointer-events-none"
        style={{ color: iconColor }}
      >
        <IconoEstado className="size-2.5" />
      </div>

      <div className="px-1.5 py-1 h-full flex flex-col justify-start overflow-hidden pr-4" style={{ color }}>
        {/* >= 60px → nombre + servicio + hora fin */}
        {alturaReal >= 60 ? (
          <>
            <p className={`text-[11px] font-bold leading-tight truncate ${esCancelada ? 'line-through' : ''}`}>
              {nombrePaciente}
            </p>
            <p className="text-[10px] leading-tight truncate mt-0.5 text-gray-600">
              {nombreServicio}
            </p>
            {esPendiente && (
              <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">· Sin confirmar</p>
            )}
            <p className="text-[10px] text-gray-400 mt-auto">{horaFin}</p>
          </>
        ) : alturaReal >= 40 ? (
          /* >= 40px → nombre + servicio */
          <>
            <p className={`text-[11px] font-bold leading-tight truncate ${esCancelada ? 'line-through' : ''}`}>
              {nombrePaciente}
            </p>
            <p className="text-[10px] leading-tight truncate mt-0.5 text-gray-600">
              {nombreServicio}
            </p>
            {alturaReal >= 50 && esPendiente && (
              <p className="text-[9px] text-amber-600 mt-auto leading-tight">· Sin confirmar</p>
            )}
            {alturaReal >= 50 && !esPendiente && (
              <p className="text-[10px] text-gray-400 mt-auto">{horaFin}</p>
            )}
          </>
        ) : (
          /* < 40px → solo nombre */
          <p className={`text-[11px] font-bold leading-tight truncate ${esCancelada ? 'line-through' : ''}`}>
            {nombrePaciente}
          </p>
        )}
      </div>
      {/* Badge de pago pendiente — esquina inferior derecha */}
      {alturaReal >= 40 && cita.estado === 'completada' && (!cita.pago_estado || cita.pago_estado === 'pendiente') && (
        <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center absolute bottom-1 right-1 pointer-events-none">
          <DollarSign className="size-2.5 text-amber-600" />
        </div>
      )}

      {/* Punto de nota clínica — esquina inferior izquierda */}
      {alturaReal >= 40 && cita.notas && cita.notas.trim().length > 0 && (
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute bottom-1 left-1 pointer-events-none" />
      )}

      {onResize && (
        <button
          type="button"
          aria-label="Ajustar duración de cita"
          onMouseDown={iniciarResize}
          className="absolute bottom-0 right-0 left-0 h-2 cursor-ns-resize bg-transparent hover:bg-black/10"
        />
      )}
      {tooltip && typeof document !== 'undefined' && (
        <TooltipCita cita={cita} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
    </>
  )
}

// ─── Bloque compacto (vista semana) ──────────────────────────────────────────

type BloqueCompactoProps = {
  cita: CitaConRelaciones
  onClick: (cita: CitaConRelaciones) => void
}

export function BloqueCompacto({ cita, onClick }: BloqueCompactoProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const color = cita.profesionales?.color ?? '#2563EB'
  const borde = ESTADO_BORDE[cita.estado]
  const IconoEstado = ESTADO_ICONO[cita.estado]
  const iconColor = ESTADO_ICONO_COLOR[cita.estado]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(cita)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(cita)}
      onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltip(null)}
      className="relative rounded px-1.5 py-1 mb-0.5 cursor-pointer transition-all hover:brightness-95 overflow-hidden"
      style={{
        backgroundColor: hexToRgba(color, 0.1),
        borderLeft: `3px ${borde.style} ${borde.color}`,
        opacity: cita.estado === 'cancelada' ? 0.5 : 1,
      }}
    >
      {/* Ícono de estado — esquina superior derecha */}
      <div
        className="absolute top-0.5 right-0.5 pointer-events-none"
        style={{ color: iconColor }}
      >
        <IconoEstado className="size-2.5" />
      </div>

      <p
        className={`text-[11px] font-semibold truncate pr-3 ${cita.estado === 'cancelada' ? 'line-through' : ''}`}
        style={{ color }}
      >
        {cita.pacientes?.nombre ?? 'Paciente'}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <p className="text-[10px] text-gray-500 truncate">{cita.servicios?.nombre}</p>
      </div>
      {tooltip && typeof document !== 'undefined' && (
        <TooltipCita cita={cita} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  )
}
