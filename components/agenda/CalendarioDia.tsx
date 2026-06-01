'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Calendar, Ban } from 'lucide-react'
import { citaWallClockMinutes } from '@/lib/agenda/datetime'
import type { CitaConRelaciones, ProfesionalRow } from '@/lib/agenda/queries'
import { BloqueCita, PIXEL_POR_MIN, HORA_GRILLA_INICIO } from './BloquesCita'
import { BloqueHorario } from './BloqueHorario'
import type { BloqueoProfesional } from '@/lib/agenda/queries'

const HORA_FIN_GRILLA = 20
const HORAS_TOTALES = HORA_FIN_GRILLA - HORA_GRILLA_INICIO  // 12 horas
const ALTURA_HORA_PX = PIXEL_POR_MIN * 60   // 90px por hora
const ALTO_TOTAL_PX = HORAS_TOTALES * ALTURA_HORA_PX  // 1080px

const horasGrilla = Array.from(
  { length: HORAS_TOTALES + 1 },
  (_, i) => HORA_GRILLA_INICIO + i
)

function minutosDia(iso: string): number {
  return citaWallClockMinutes(iso)
}

// Algoritmo interval graph coloring para asignar columnas sin solapamiento
function calcularColumnas(citas: CitaConRelaciones[]) {
  const sorted = [...citas].sort((a, b) => minutosDia(a.inicio) - minutosDia(b.inicio))
  const cols: number[] = [] // fin del último bloque en cada columna
  const resultado = sorted.map(cita => {
    const inicio = minutosDia(cita.inicio)
    const fin = minutosDia(cita.fin)
    let col = cols.findIndex(finCol => finCol <= inicio)
    if (col === -1) { col = cols.length; cols.push(fin) }
    else cols[col] = fin
    return { cita, col }
  })
  return resultado.map(r => ({ ...r, totalCols: cols.length }))
}

function calcularPosicion(inicio: string, fin: string) {
  const minI = minutosDia(inicio)
  const minF = minutosDia(fin)
  return {
    top: Math.max(0, (minI - HORA_GRILLA_INICIO * 60) * PIXEL_POR_MIN),
    height: Math.max(20, (minF - minI) * PIXEL_POR_MIN),
  }
}

// Devuelve la etiqueta de hora correspondiente a una posición Y en la grilla
function etiquetaDesdeY(y: number): string {
  const totalMin = HORA_GRILLA_INICIO * 60 + Math.floor(y / PIXEL_POR_MIN)
  const h = Math.min(Math.floor(totalMin / 60), 23)
  const m = Math.floor((totalMin % 60) / 15) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Columna de un profesional ────────────────────────────────────────────────

type MenuContextual = {
  x: number
  y: number
  hora: Date
  profesionalId: string | undefined
}

function ColumnaProfesional({
  profesional,
  citas,
  bloqueos,
  onClickCita,
  onClickCelda,
  onBloquearHorario,
  onResizeCita,
  onMoveCita,
  onEliminarBloqueo,
  onEditarBloqueo,
  fecha,
  horaInicioLaboral,
  horaFinLaboral,
}: {
  profesional: ProfesionalRow
  citas: CitaConRelaciones[]
  bloqueos: BloqueoProfesional[]
  onClickCita: (cita: CitaConRelaciones) => void
  onClickCelda: (profesionalId: string | undefined, hora: Date) => void
  onBloquearHorario: (profesionalId: string | undefined, hora: Date) => void
  onResizeCita: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onMoveCita?: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onEliminarBloqueo?: (id: string) => void
  onEditarBloqueo?: (bloqueo: BloqueoProfesional) => void
  fecha: Date
  horaInicioLaboral?: number
  horaFinLaboral?: number
}) {
  const dispuestas = calcularColumnas(citas)
  const [hoverY, setHoverY] = useState<number | null>(null)
  const [sobreFondo, setSobreFondo] = useState(false)
  const [menu, setMenu] = useState<MenuContextual | null>(null)

  function horaDesdeY(y: number): Date {
    const minutos = Math.floor(y / PIXEL_POR_MIN)
    const minutosRedondeados = Math.floor(minutos / 15) * 15
    const hora = new Date(fecha)
    hora.setHours(HORA_GRILLA_INICIO + Math.floor(minutosRedondeados / 60))
    hora.setMinutes(minutosRedondeados % 60)
    hora.setSeconds(0)
    return hora
  }

  function handleClickFondo(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const hora = horaDesdeY(e.clientY - e.currentTarget.getBoundingClientRect().top)
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, hora, profesionalId: profesional.id })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoverY(e.clientY - rect.top)
    setSobreFondo(e.target === e.currentTarget)
  }

  return (
    <div
      className="relative border-l border-gray-100 cursor-crosshair"
      style={{ height: ALTO_TOTAL_PX, minWidth: 120 }}
      onClick={handleClickFondo}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHoverY(null); setSobreFondo(false) }}
    >
      {/* Menú contextual */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="absolute z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden"
            style={{ top: menu.y, left: menu.x, maxWidth: 180, minWidth: 160 }}
          >
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
              onClick={() => { setMenu(null); onClickCelda(menu.profesionalId, menu.hora) }}
            >
              <Calendar className="size-3.5 text-[#2563EB] shrink-0" />
              Nueva cita
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
              onClick={() => { setMenu(null); onBloquearHorario(menu.profesionalId, menu.hora) }}
            >
              <Ban className="size-3.5 text-gray-400 shrink-0" />
              Bloquear horario
            </button>
          </div>
        </>
      )}

      {/* Highlight de cuarto de hora al pasar el mouse sobre fondo vacío */}
      {sobreFondo && hoverY !== null && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-0 bg-gray-50"
          style={{
            top: Math.floor(hoverY / (PIXEL_POR_MIN * 15)) * (PIXEL_POR_MIN * 15),
            height: PIXEL_POR_MIN * 15,
          }}
        />
      )}

      {/* Tooltip de hora al hover sobre fondo */}
      {sobreFondo && hoverY !== null && (
        <div
          className="absolute left-1.5 pointer-events-none z-30 bg-gray-800 text-white text-[10px] font-medium rounded px-1.5 py-0.5 shadow-md"
          style={{ top: Math.max(2, hoverY - 10) }}
        >
          {etiquetaDesdeY(hoverY)}
        </div>
      )}

      {/* Fuera de horario — mañana */}
      {horaInicioLaboral !== undefined && horaInicioLaboral > HORA_GRILLA_INICIO && (
        <div
          className="absolute left-0 right-0 bg-gray-50/70 pointer-events-none z-0"
          style={{
            top: 0,
            height: (horaInicioLaboral - HORA_GRILLA_INICIO) * ALTURA_HORA_PX,
          }}
        />
      )}
      {/* Fuera de horario — tarde */}
      {horaFinLaboral !== undefined && horaFinLaboral < HORA_FIN_GRILLA && (
        <div
          className="absolute left-0 right-0 bg-gray-50/70 pointer-events-none z-0"
          style={{
            top: (horaFinLaboral - HORA_GRILLA_INICIO) * ALTURA_HORA_PX,
            bottom: 0,
          }}
        />
      )}

      {/* Bloqueos de horario */}
      {bloqueos.map((bloqueo) => {
        const { top, height } = calcularPosicion(bloqueo.inicio, bloqueo.fin)
        return (
          <BloqueHorario
            key={bloqueo.id}
            bloqueo={bloqueo}
            topPx={top}
            heightPx={height}
            onEliminar={onEliminarBloqueo ? () => onEliminarBloqueo(bloqueo.id) : undefined}
            onEditar={onEditarBloqueo ? () => onEditarBloqueo(bloqueo) : undefined}
          />
        )
      })}

      {/* Citas posicionadas absolutamente */}
      {dispuestas.map(({ cita, col, totalCols }) => {
        const { top, height } = calcularPosicion(cita.inicio, cita.fin)
        const ancho = 100 / totalCols
        const bufferPx = (cita.buffer_minutos ?? 0) * PIXEL_POR_MIN
        return (
          <BloqueCita
            key={cita.id}
            cita={cita}
            onClick={onClickCita}
            onResize={onResizeCita}
            onMove={onMoveCita}
            topPx={top + 1}
            heightPx={height - 2}
            leftPercent={col * ancho + 0.5}
            widthPercent={ancho - 1}
            bufferPx={bufferPx}
          />
        )
      })}
    </div>
  )
}

// ─── Componente principal CalendarioDia ───────────────────────────────────────

type Props = {
  fecha: Date
  profesionales: ProfesionalRow[]
  citas: CitaConRelaciones[]
  bloqueos?: BloqueoProfesional[]
  profesionalesFiltrados: string[]
  onClickCita: (cita: CitaConRelaciones) => void
  onClickCelda: (profesionalId: string | undefined, hora: Date) => void
  onBloquearHorario?: (profesionalId: string | undefined, hora: Date) => void
  onResizeCita: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onMoveCita?: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onEliminarBloqueo?: (id: string) => void
  onEditarBloqueo?: (bloqueo: BloqueoProfesional) => void
  horaInicioLaboral?: number
  horaFinLaboral?: number
}

export function CalendarioDia({
  fecha,
  profesionales,
  citas,
  bloqueos = [],
  profesionalesFiltrados,
  onClickCita,
  onClickCelda,
  onBloquearHorario,
  onResizeCita,
  onMoveCita,
  onEliminarBloqueo,
  onEditarBloqueo,
  horaInicioLaboral,
  horaFinLaboral,
}: Props) {
  const [lineaHora, setLineaHora] = useState<number | null>(() => {
    const ahora = new Date()
    const h = ahora.getHours()
    const m = ahora.getMinutes()
    if (h < HORA_GRILLA_INICIO || h >= HORA_FIN_GRILLA) return null
    return (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX + m * PIXEL_POR_MIN
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  const profsVisibles = profesionales.filter(
    (p) => profesionalesFiltrados.length === 0 || profesionalesFiltrados.includes(p.id)
  )

  function calcularLineaActual() {
    const ahora = new Date()
    const h = ahora.getHours()
    const m = ahora.getMinutes()
    if (h < HORA_GRILLA_INICIO || h >= HORA_FIN_GRILLA) {
      setLineaHora(null)
      return
    }
    setLineaHora((h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX + m * PIXEL_POR_MIN)
  }

  useEffect(() => {
    const intervalo = setInterval(calcularLineaActual, 60_000)
    return () => clearInterval(intervalo)
  }, [])

  // Scroll automático a la hora actual (o a las 8am si es de noche)
  useEffect(() => {
    if (scrollRef.current) {
      const target = lineaHora !== null ? Math.max(0, lineaHora - 150) : 0
      scrollRef.current.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, [lineaHora])

  const esHoy = format(fecha, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Cabecera: columna de hora + columnas de profesionales */}
      <div
        className="flex border-b border-gray-100 shrink-0 bg-white"
        style={{ paddingLeft: 56 }}
      >
        {profsVisibles.map((prof) => {
          const citasProf = citas.filter((c) => c.profesional_id === prof.id)
          const iniciales = prof.nombre
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
          const citasActivas = citasProf.filter(
            (c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio'
          )
          const minutosOcupados = citasActivas.reduce((sum, c) => {
            const minI = minutosDia(c.inicio)
            const minF = minutosDia(c.fin)
            return sum + Math.max(0, minF - minI)
          }, 0)
          const minutosLaborales =
            horaInicioLaboral !== undefined && horaFinLaboral !== undefined
              ? (horaFinLaboral - horaInicioLaboral) * 60
              : 480
          const porcentaje = minutosLaborales > 0
            ? Math.min(100, Math.round((minutosOcupados / minutosLaborales) * 100))
            : 0
          const colorBarra =
            porcentaje > 80
              ? 'bg-red-400'
              : porcentaje >= 50
              ? 'bg-amber-400'
              : 'bg-emerald-400'

          return (
            <div
              key={prof.id}
              className="flex-1 min-w-[120px] px-3 py-2.5 border-l border-gray-100 text-center flex flex-col items-center gap-1"
            >
              {/* Avatar circular con iniciales */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                style={{ backgroundColor: prof.color }}
              >
                {iniciales}
              </div>
              <p className="text-[12px] font-semibold text-gray-800 leading-tight">{prof.nombre}</p>
              {prof.especialidad && (
                <p className="text-[10px] text-gray-400 leading-tight">{prof.especialidad}</p>
              )}
              <p className="text-[10px] text-gray-400">
                {citasProf.length} {citasProf.length === 1 ? 'cita' : 'citas'} hoy
              </p>
              {/* Barra de ocupación */}
              <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${colorBarra}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">{porcentaje}% ocupado</p>
            </div>
          )
        })}

        {profsVisibles.length === 0 && (
          <div className="flex-1 py-3 text-center text-[13px] text-gray-400">
            Selecciona al menos un profesional
          </div>
        )}
      </div>

      {/* Cuerpo con scroll */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex" style={{ minHeight: ALTO_TOTAL_PX }}>
          {/* Columna de horas fija */}
          <div className="w-14 shrink-0 relative" style={{ height: ALTO_TOTAL_PX }}>
            {horasGrilla.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] font-medium text-gray-400"
                style={{ top: (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX - 7 }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Área de columnas de profesionales con posicionamiento relativo compartido */}
          <div className="flex flex-1 relative" style={{ height: ALTO_TOTAL_PX }}>
            {/* Líneas horizontales de hora y cuarto de hora */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {horasGrilla.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX }}
                />
              ))}
              {/* Línea punteada de media hora (más visible) y cuartos (muy tenue) */}
              {horasGrilla.slice(0, -1).flatMap((h) =>
                [15, 30, 45].map((m) => (
                  <div
                    key={`${h}-${m}`}
                    className={`absolute left-0 right-0 border-t ${
                      m === 30
                        ? 'border-dashed border-gray-100'
                        : 'border-dashed border-gray-50'
                    }`}
                    style={{ top: (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX + m * PIXEL_POR_MIN }}
                  />
                ))
              )}
            </div>

            {/* Línea roja de hora actual */}
            {esHoy && lineaHora !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                style={{ top: lineaHora }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" style={{ marginLeft: -4 }} />
                <div className="flex-1 border-t-2 border-red-500" />
              </div>
            )}

            {/* Columnas de profesionales */}
            {profsVisibles.map((prof) => {
              const citasProf = citas.filter((c) => c.profesional_id === prof.id)
              const bloqueosProf = bloqueos.filter((b) => b.profesional_id === prof.id)
              return (
                <div key={prof.id} className="flex-1 min-w-[120px]">
                  <ColumnaProfesional
                    profesional={prof}
                    citas={citasProf}
                    bloqueos={bloqueosProf}
                    onClickCita={onClickCita}
                    onClickCelda={onClickCelda}
                    onBloquearHorario={onBloquearHorario ?? (() => undefined)}
                    onResizeCita={onResizeCita}
                    onMoveCita={onMoveCita}
                    onEliminarBloqueo={onEliminarBloqueo}
                    onEditarBloqueo={onEditarBloqueo}
                    fecha={fecha}
                    horaInicioLaboral={horaInicioLaboral}
                    horaFinLaboral={horaFinLaboral}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
