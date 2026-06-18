'use client'

import React, { useEffect, useRef, useState } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { Calendar, Ban } from 'lucide-react'
import { citaWallClockDate, citaWallClockMinutes } from '@/lib/agenda/datetime'
import type { CitaConRelaciones, BloqueoProfesional } from '@/lib/agenda/queries'
import { BloqueCita, PIXEL_POR_MIN, HORA_GRILLA_INICIO } from './BloquesCita'
import { BloqueHorario } from './BloqueHorario'

const HORA_FIN = 20
const HORAS_TOTALES = HORA_FIN - HORA_GRILLA_INICIO   // 12 horas
const ALTURA_HORA_PX = PIXEL_POR_MIN * 60             // 90px por hora
const ALTO_TOTAL_PX = HORAS_TOTALES * ALTURA_HORA_PX  // 1080px

const horasGrilla = Array.from({ length: HORAS_TOTALES + 1 }, (_, i) => HORA_GRILLA_INICIO + i)
const DIAS_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function minutosDia(iso: string): number {
  return citaWallClockMinutes(iso)
}

// Interval graph coloring: asigna columnas a citas solapadas del mismo día
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

function etiquetaDesdeY(y: number): string {
  const totalMin = HORA_GRILLA_INICIO * 60 + Math.floor(y / PIXEL_POR_MIN)
  const h = Math.min(Math.floor(totalMin / 60), 23)
  const m = Math.floor((totalMin % 60) / 15) * 15
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const MAX_COLS_SEMANA = 3

// ─── Columna de un día en la vista semana ────────────────────────────────────

type MenuContextualSemana = {
  x: number
  y: number
  hora: Date
  profesionalId: string | undefined
}

function calcularPosicion(inicio: string, fin: string) {
  const minI = citaWallClockMinutes(inicio)
  const minF = citaWallClockMinutes(fin)
  return {
    top: Math.max(0, (minI - HORA_GRILLA_INICIO * 60) * PIXEL_POR_MIN),
    height: Math.max(20, (minF - minI) * PIXEL_POR_MIN),
  }
}

function ColumnaDia({
  dia,
  esHoy,
  lineaHora,
  citas,
  bloqueos,
  profesionalesFiltrados,
  onClickCita,
  onClickCelda,
  onBloquearHorario,
  onResizeCita,
  onMoveCita,
  onEliminarBloqueo,
  onEditarBloqueo,
}: {
  dia: Date
  esHoy: boolean
  lineaHora?: number | null
  citas: CitaConRelaciones[]
  bloqueos: BloqueoProfesional[]
  profesionalesFiltrados: string[]
  onClickCita: (cita: CitaConRelaciones) => void
  onClickCelda: (profesionalId: string | undefined, hora: Date) => void
  onBloquearHorario: (profesionalId: string | undefined, hora: Date) => void
  onResizeCita: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onMoveCita?: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onEliminarBloqueo?: (id: string) => void
  onEditarBloqueo?: (bloqueo: BloqueoProfesional) => void
}) {
  const dispuestas = calcularColumnas(citas)
  const [hoverY, setHoverY] = useState<number | null>(null)
  const [sobreFondo, setSobreFondo] = useState(false)
  const [menu, setMenu] = useState<MenuContextualSemana | null>(null)

  function horaDesdeY(y: number): Date {
    const minutos = Math.floor(y / PIXEL_POR_MIN)
    const minutosRedondeados = Math.floor(minutos / 15) * 15
    const hora = new Date(dia)
    hora.setHours(HORA_GRILLA_INICIO + Math.floor(minutosRedondeados / 60))
    hora.setMinutes(minutosRedondeados % 60)
    hora.setSeconds(0)
    return hora
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const hora = horaDesdeY(y)
    const profId = profesionalesFiltrados.length === 1 ? profesionalesFiltrados[0] : undefined
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, hora, profesionalId: profId })
  }

  return (
    <div
      className={`relative flex-1 border-l border-gray-50 cursor-crosshair min-w-0 ${esHoy ? 'bg-blue-50/15' : ''}`}
      style={{ height: ALTO_TOTAL_PX }}
      onClick={handleClick}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setHoverY(e.clientY - rect.top)
        setSobreFondo(e.target === e.currentTarget)
      }}
      onMouseLeave={() => { setHoverY(null); setSobreFondo(false) }}
    >
      {/* Línea roja hora actual — solo en el día de hoy */}
      {esHoy && lineaHora != null && (
        <div
          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
          style={{ top: lineaHora }}
        >
          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" style={{ marginLeft: -4 }} />
          <div className="flex-1 border-t-2 border-red-500" />
        </div>
      )}

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

      {/* Highlight de cuarto de hora al hover sobre fondo */}
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
          className="absolute left-1 pointer-events-none z-30 bg-gray-800 text-white text-[10px] font-medium rounded px-1.5 py-0.5 shadow-md whitespace-nowrap"
          style={{ top: Math.max(2, hoverY - 10) }}
        >
          {etiquetaDesdeY(hoverY)}
        </div>
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

      {/* Citas posicionadas absolutamente — máximo 3 columnas visibles */}
      {dispuestas
        .filter(({ col }) => col < MAX_COLS_SEMANA)
        .map(({ cita, col, totalCols }) => {
          const minI = minutosDia(cita.inicio)
          const minF = minutosDia(cita.fin)
          const top = Math.max(0, (minI - HORA_GRILLA_INICIO * 60) * PIXEL_POR_MIN)
          const height = Math.max((minF - minI) * PIXEL_POR_MIN, 24)
          const colsEfectivas = Math.min(totalCols, MAX_COLS_SEMANA)
          const ancho = 100 / colsEfectivas
          const overflowCount = totalCols > MAX_COLS_SEMANA ? totalCols - MAX_COLS_SEMANA : 0
          const mostrarOverflow = overflowCount > 0 && col === MAX_COLS_SEMANA - 1

          return (
            <React.Fragment key={cita.id}>
              <BloqueCita
                cita={cita}
                onClick={onClickCita}
                onResize={onResizeCita}
                onMove={onMoveCita}
                citas={citas}
                topPx={top + 1}
                heightPx={height - 2}
                leftPercent={col * ancho + 0.5}
                widthPercent={ancho - 1}
                bufferPx={(cita.buffer_minutos ?? 0) * PIXEL_POR_MIN}
              />
              {/* Badge "+N más" cuando hay citas que no caben */}
              {mostrarOverflow && (
                <div
                  className="absolute pointer-events-none z-10 flex items-end justify-end p-1"
                  style={{
                    top: top + 1,
                    height: height - 2,
                    left: `${col * ancho + 0.5}%`,
                    width: `${ancho - 1}%`,
                  }}
                >
                  <span className="bg-gray-700/80 text-white text-[9px] font-bold rounded px-1 py-0.5 leading-none">
                    +{overflowCount}
                  </span>
                </div>
              )}
            </React.Fragment>
          )
        })}
    </div>
  )
}

// ─── Componente principal CalendarioSemana ────────────────────────────────────

type Props = {
  fechaBase: Date
  profesionalesFiltrados: string[]
  citas: CitaConRelaciones[]
  bloqueos?: BloqueoProfesional[]
  onClickCita: (cita: CitaConRelaciones) => void
  onClickCelda: (profesionalId: string | undefined, hora: Date) => void
  onBloquearHorario?: (profesionalId: string | undefined, hora: Date) => void
  onResizeCita: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onMoveCita?: (cita: CitaConRelaciones, deltaMinutos: number) => void
  onVerDia?: (fecha: Date) => void
  onEliminarBloqueo?: (id: string) => void
  onEditarBloqueo?: (bloqueo: BloqueoProfesional) => void
}

export function CalendarioSemana({
  fechaBase,
  profesionalesFiltrados,
  citas,
  bloqueos = [],
  onClickCita,
  onClickCelda,
  onBloquearHorario,
  onResizeCita,
  onMoveCita,
  onVerDia,
  onEliminarBloqueo,
  onEditarBloqueo,
}: Props) {
  const hoy = new Date()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [lineaHora, setLineaHora] = useState<number | null>(() => {
    const ahora = new Date()
    const h = ahora.getHours()
    const m = ahora.getMinutes()
    if (h < HORA_GRILLA_INICIO || h >= HORA_FIN) return null
    return (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX + m * PIXEL_POR_MIN
  })

  const lunesSemana = startOfWeek(fechaBase, { weekStartsOn: 1 })
  const diasFecha = Array.from({ length: 7 }, (_, i) => addDays(lunesSemana, i))

  const citasFiltradas = profesionalesFiltrados.length === 0
    ? citas
    : citas.filter((c) => profesionalesFiltrados.includes(c.profesional_id))

  function calcularLineaActual() {
    const ahora = new Date()
    const h = ahora.getHours()
    const m = ahora.getMinutes()
    if (h < HORA_GRILLA_INICIO || h >= HORA_FIN) { setLineaHora(null); return }
    setLineaHora((h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX + m * PIXEL_POR_MIN)
  }

  useEffect(() => {
    const intervalo = setInterval(calcularLineaActual, 60_000)
    return () => clearInterval(intervalo)
  }, [])

  // Scroll automático centrado en la hora actual (o inicio de jornada)
  useEffect(() => {
    if (scrollRef.current) {
      const target = lineaHora !== null ? Math.max(0, lineaHora - 150) : 0
      scrollRef.current.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, [lineaHora])

  // La línea roja se muestra solo si la semana visualizada contiene hoy
  const esEstaSemana = diasFecha.some((d) => isSameDay(d, hoy))
  const [mostrarConteos, setMostrarConteos] = useState(false)

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Cabecera sticky de días */}
      <div
        className="flex shrink-0 border-b border-gray-100 bg-white"
        style={{ paddingLeft: 56 }}
      >
        {diasFecha.map((dia, i) => {
          const esHoy = isSameDay(dia, hoy)
          const numDia = parseInt(format(dia, 'd'))
          const diaStr = format(dia, 'yyyy-MM-dd')
          const totalCitas = citasFiltradas.filter((c) => citaWallClockDate(c.inicio) === diaStr).length

          return (
            <div
              key={i}
              className={`flex-1 py-2 text-center border-l border-gray-50 min-w-0 ${esHoy ? 'bg-blue-50/30' : ''}`}
            >
              {/* Nombre del día abreviado */}
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {DIAS_NOMBRES[i]}
              </p>

              {/* Número del día — círculo si es hoy, clickeable para ir a vista día */}
              <button
                type="button"
                onClick={() => onVerDia?.(dia)}
                className={`text-[16px] font-bold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full transition-colors ${
                  esHoy
                    ? 'bg-[#2563EB] text-white'
                    : onVerDia
                    ? 'text-gray-700 hover:bg-blue-100 hover:text-blue-700 cursor-pointer'
                    : 'text-gray-700 cursor-default'
                }`}
              >
                {numDia}
              </button>

              {/* Badge de citas del día — solo si mostrarConteos */}
              {mostrarConteos && totalCitas > 0 && (
                <div className="flex justify-center mt-0.5">
                  <span
                    className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                      totalCitas >= 7
                        ? 'bg-red-50 text-red-600'
                        : totalCitas >= 4
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {totalCitas}
                  </span>
                </div>
              )}
              {/* Spacer para mantener altura uniforme cuando están ocultos */}
              {!mostrarConteos && <div className="h-[18px] mt-0.5" />}
            </div>
          )
        })}

        {/* Botón toggle conteos — columna derecha de la cabecera */}
        <button
          type="button"
          onClick={() => setMostrarConteos(v => !v)}
          title={mostrarConteos ? 'Ocultar conteo de citas' : 'Mostrar conteo de citas'}
          className="w-6 shrink-0 flex items-end justify-center pb-2 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: mostrarConteos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Cuerpo scrolleable */}
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

          {/* Área de días con líneas de fondo y bloques de citas */}
          <div className="flex flex-1 relative" style={{ height: ALTO_TOTAL_PX }}>
            {/* Líneas de hora y cuarto de hora (sobre todos los días) */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {horasGrilla.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX }}
                />
              ))}
              {/* Mini-líneas de cuarto de hora */}
              {horasGrilla.slice(0, -1).flatMap((h) =>
                [15, 30, 45].map((m) => (
                  <div
                    key={`${h}-${m}`}
                    className="absolute left-0 right-0 border-t border-dashed border-gray-50"
                    style={{ top: (h - HORA_GRILLA_INICIO) * ALTURA_HORA_PX + m * PIXEL_POR_MIN }}
                  />
                ))
              )}
            </div>

            {/* Columna de cada día */}
            {diasFecha.map((dia, i) => {
              const diaStr = format(dia, 'yyyy-MM-dd')
              const citasDia = citasFiltradas.filter((c) => citaWallClockDate(c.inicio) === diaStr)
              const bloqueosDia = bloqueos.filter((b) => citaWallClockDate(b.inicio) === diaStr)
              const esHoy = isSameDay(dia, hoy)
              return (
                <ColumnaDia
                  key={i}
                  dia={dia}
                  esHoy={esHoy}
                  lineaHora={esHoy && esEstaSemana ? lineaHora : null}
                  citas={citasDia}
                  bloqueos={bloqueosDia}
                  profesionalesFiltrados={profesionalesFiltrados}
                  onClickCita={onClickCita}
                  onClickCelda={onClickCelda}
                  onBloquearHorario={onBloquearHorario ?? (() => undefined)}
                  onResizeCita={onResizeCita}
                  onMoveCita={onMoveCita}
                  onEliminarBloqueo={onEliminarBloqueo}
                  onEditarBloqueo={onEditarBloqueo}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
