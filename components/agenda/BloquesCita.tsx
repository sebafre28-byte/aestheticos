'use client'

import { useRef, useState } from 'react'
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

const ESTADO_ICONO: Record<EstadoCita, React.ComponentType<{ className?: string }>> = {
  pendiente:  Clock,
  confirmada: CheckCircle,
  completada: CheckCircle2,
  cancelada:  XCircle,
  no_asistio: UserX,
}

const ESTADO_ICONO_COLOR: Record<EstadoCita, string> = {
  pendiente:  '#D97706',
  confirmada: '#0D9488',
  completada: '#2563EB',
  cancelada:  '#DC2626',
  no_asistio: '#991B1B',
}

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
  onMove?: (cita: CitaConRelaciones, deltaMinutos: number) => void
  citas?: CitaConRelaciones[]
  topPx: number
  heightPx: number
  leftPercent?: number
  widthPercent?: number
  bufferPx?: number
}

function minutosDia(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export function BloqueCita({
  cita,
  onClick,
  onDragStart,
  onResize,
  onMove,
  citas,
  topPx,
  heightPx,
  leftPercent = 0,
  widthPercent = 100,
  bufferPx = 0,
}: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const [dragOffsetPx, setDragOffsetPx] = useState(0)
  const [snapMin, setSnapMin] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const didDragRef = useRef(false)
  const dragStartYRef = useRef<number | null>(null)

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

  // Conflict detection during drag
  const citaStartMin = minutosDia(cita.inicio)
  const duration = minutosDia(cita.fin) - citaStartMin
  const hasConflict = isDragging && (citas ?? []).some(other => {
    if (other.id === cita.id) return false
    const newStartMin = citaStartMin + snapMin
    const newEndMin = newStartMin + duration
    return newStartMin < minutosDia(other.fin) && newEndMin > minutosDia(other.inicio)
  })

  const bgColor = isDragging && hasConflict
    ? 'rgba(239,68,68,0.15)'
    : esNoAsistio ? 'rgba(254,226,226,0.85)' : hexToRgba(color, 0.12)

  const estiloBloque: React.CSSProperties = {
    top: topPx,
    height: alturaReal,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    backgroundColor: bgColor,
    opacity: esCancelada ? 0.5 : isDragging ? 0.75 : 1,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderLeftWidth: 3,
    borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid',
    borderLeftStyle: borde.style,
    borderTopColor: hexToRgba(color, 0.2), borderRightColor: hexToRgba(color, 0.2),
    borderBottomColor: hexToRgba(color, 0.2), borderLeftColor: borde.color,
    transform: isDragging ? `translateY(${dragOffsetPx}px)` : undefined,
    zIndex: isDragging ? 50 : undefined,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
    cursor: onMove ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
  }

  function iniciarMove(e: React.MouseEvent<HTMLDivElement>) {
    if (onMove == null) return
    if ((e.target as HTMLElement).closest('button')) return
    e.stopPropagation()
    dragStartYRef.current = e.clientY
    didDragRef.current = false

    function onMouseMove(ev: MouseEvent) {
      if (dragStartYRef.current === null) return
      const diffPx = ev.clientY - dragStartYRef.current
      if (Math.abs(diffPx) > 4) { didDragRef.current = true; setIsDragging(true) }
      const snap = Math.round((diffPx / PIXEL_POR_MIN) / 15) * 15
      setSnapMin(snap)
      setDragOffsetPx(snap * PIXEL_POR_MIN)
    }

    function onMouseUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (dragStartYRef.current !== null && didDragRef.current) {
        const diffPx = ev.clientY - dragStartYRef.current
        const snap = Math.round((diffPx / PIXEL_POR_MIN) / 15) * 15
        if (snap !== 0) onMove!(cita, snap)
      }
      setDragOffsetPx(0)
      setSnapMin(0)
      setIsDragging(false)
      dragStartYRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function iniciarResize(event: React.MouseEvent<HTMLButtonElement>) {
    if (onResize == null) return
    event.stopPropagation()
    const yInicio = event.clientY

    function onMouseMove(e: MouseEvent) {
      const diffMin = Math.round(((e.clientY - yInicio) / PIXEL_POR_MIN) / 15) * 15
      onResize!(cita, diffMin)
    }
    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <>
    {bufferPx > 0 && (
      <div
        className="absolute pointer-events-none rounded-b-md"
        style={{
          top: topPx + alturaReal, height: bufferPx,
          left: `${leftPercent}%`, width: `${widthPercent}%`,
          backgroundColor: 'rgba(251,146,60,0.12)',
          borderLeft: '3px solid rgba(251,146,60,0.25)',
          borderRight: '1px solid rgba(251,146,60,0.15)',
          borderBottom: '1px solid rgba(251,146,60,0.15)',
        }}
      />
    )}
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!didDragRef.current) onClick(cita) }}
      onKeyDown={(e) => e.key === 'Enter' && onClick(cita)}
      onMouseDown={iniciarMove}
      draggable={!onMove}
      onDragStart={(event) => {
        if (onMove) return
        event.dataTransfer.setData('text/cita-id', cita.id)
        onDragStart?.(cita)
      }}
      onMouseEnter={(e) => !isDragging && setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => !isDragging && setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltip(null)}
      className="absolute rounded-md select-none overflow-hidden"
      style={estiloBloque}
    >
      <div className="absolute top-0.5 right-0.5 z-10 pointer-events-none" style={{ color: iconColor }}>
        <IconoEstado className="size-2.5" />
      </div>

      <div className="px-1.5 py-1 h-full flex flex-col justify-start overflow-hidden pr-4" style={{ color }}>
        {alturaReal >= 60 ? (
          <>
            <p className={`text-[11px] font-bold leading-tight truncate ${esCancelada ? 'line-through' : ''}`}>{nombrePaciente}</p>
            <p className="text-[10px] leading-tight truncate mt-0.5 text-gray-600">{nombreServicio}</p>
            {esPendiente && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">· Sin confirmar</p>}
            <p className="text-[10px] text-gray-400 mt-auto">{horaFin}</p>
          </>
        ) : alturaReal >= 40 ? (
          <>
            <p className={`text-[11px] font-bold leading-tight truncate ${esCancelada ? 'line-through' : ''}`}>{nombrePaciente}</p>
            <p className="text-[10px] leading-tight truncate mt-0.5 text-gray-600">{nombreServicio}</p>
            {alturaReal >= 50 && esPendiente && <p className="text-[9px] text-amber-600 mt-auto leading-tight">· Sin confirmar</p>}
            {alturaReal >= 50 && !esPendiente && <p className="text-[10px] text-gray-400 mt-auto">{horaFin}</p>}
          </>
        ) : (
          <p className={`text-[11px] font-bold leading-tight truncate ${esCancelada ? 'line-through' : ''}`}>{nombrePaciente}</p>
        )}
      </div>

      {alturaReal >= 40 && cita.estado === 'completada' && (!cita.pago_estado || cita.pago_estado === 'pendiente') && (
        <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center absolute bottom-1 right-1 pointer-events-none">
          <DollarSign className="size-2.5 text-amber-600" />
        </div>
      )}
      {alturaReal >= 40 && cita.notas && cita.notas.trim().length > 0 && (
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute bottom-1 left-1 pointer-events-none" />
      )}

      {onResize && (
        <button
          type="button"
          aria-label="Ajustar duración"
          onMouseDown={iniciarResize}
          className="absolute bottom-0 right-0 left-0 h-2 cursor-ns-resize bg-transparent hover:bg-black/10"
        />
      )}

      {isDragging && (
        <div className="absolute inset-x-0 top-0.5 flex justify-center pointer-events-none">
          <span className={`text-white text-[10px] font-medium rounded px-1.5 py-0.5 ${hasConflict ? 'bg-red-500' : 'bg-gray-900/80'}`}>{horaInicio}</span>
        </div>
      )}

      {tooltip && !isDragging && typeof document !== 'undefined' && (
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
      <div className="absolute top-0.5 right-0.5 pointer-events-none" style={{ color: iconColor }}>
        <IconoEstado className="size-2.5" />
      </div>
      <p className={`text-[11px] font-semibold truncate pr-3 ${cita.estado === 'cancelada' ? 'line-through' : ''}`} style={{ color }}>
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
