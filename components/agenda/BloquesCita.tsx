'use client'

import { Clock, CheckCircle, CheckCircle2, XCircle, UserX } from 'lucide-react'
import type { CitaConRelaciones, EstadoCita } from '@/lib/agenda/queries'

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
  topPx: number
  heightPx: number
  leftPercent?: number
  widthPercent?: number
}

export function BloqueCita({
  cita,
  onClick,
  topPx,
  heightPx,
  leftPercent = 0,
  widthPercent = 100,
}: Props) {
  const color = cita.profesionales?.color ?? '#2563EB'
  const horaInicio = cita.inicio.slice(11, 16)
  const horaFin = cita.fin.slice(11, 16)
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

  const tituloTooltip = alturaReal < 40
    ? `${nombrePaciente}${nombreServicio ? ' · ' + nombreServicio : ''} · ${horaInicio}–${horaFin}`
    : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(cita)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(cita)}
      title={tituloTooltip}
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
    </div>
  )
}

// ─── Bloque compacto (vista semana) ──────────────────────────────────────────

type BloqueCompactoProps = {
  cita: CitaConRelaciones
  onClick: (cita: CitaConRelaciones) => void
}

export function BloqueCompacto({ cita, onClick }: BloqueCompactoProps) {
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
    </div>
  )
}
