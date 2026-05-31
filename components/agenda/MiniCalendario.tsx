'use client'

import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { CitaConRelaciones } from '@/lib/agenda/queries'

type Props = {
  fechaSeleccionada: Date
  citas: CitaConRelaciones[]
  onChange: (fecha: Date) => void
}

export function MiniCalendario({ fechaSeleccionada, citas, onChange }: Props) {
  const [mesVisible, setMesVisible] = useState(() => new Date(fechaSeleccionada))

  const hoy = new Date()
  const inicioMes = startOfMonth(mesVisible)
  const finMes = endOfMonth(mesVisible)
  const inicioGrid = startOfWeek(inicioMes, { weekStartsOn: 1 })
  const finGrid = endOfWeek(finMes, { weekStartsOn: 1 })

  // Construye el grid de semanas
  const semanas: Date[][] = []
  let dia = inicioGrid
  while (dia <= finGrid) {
    const semana: Date[] = []
    for (let i = 0; i < 7; i++) {
      semana.push(dia)
      dia = addDays(dia, 1)
    }
    semanas.push(semana)
  }

  // Días que tienen al menos una cita (no cancelada)
  const diasConCitas = new Set(
    citas
      .filter((c) => c.estado !== 'cancelada' && c.estado !== 'no_asistio')
      .map((c) => format(new Date(c.inicio.slice(0, 10) + 'T00:00:00'), 'yyyy-MM-dd'))
  )

  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div className="w-[220px] shrink-0 hidden lg:flex flex-col gap-4 pt-0.5">
      {/* Mes + nav */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={() => setMesVisible((m) => subMonths(m, 1))}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="size-3.5 text-gray-500" />
          </button>
          <span className="text-[12px] font-semibold text-gray-700 capitalize">
            {format(mesVisible, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            onClick={() => setMesVisible((m) => addMonths(m, 1))}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="size-3.5 text-gray-500" />
          </button>
        </div>

        {/* Headers días */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Grid días */}
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7">
            {semana.map((d, di) => {
              const esHoy = isSameDay(d, hoy)
              const esSeleccionado = isSameDay(d, fechaSeleccionada)
              const esMesActual = isSameMonth(d, mesVisible)
              const tieneCitas = diasConCitas.has(format(d, 'yyyy-MM-dd'))

              return (
                <button
                  key={di}
                  onClick={() => {
                    onChange(d)
                    // Sincroniza el mes visible si el usuario navega fuera del mes
                    if (!isSameMonth(d, mesVisible)) setMesVisible(d)
                  }}
                  className={`relative flex items-center justify-center h-7 w-7 mx-auto rounded-full text-[12px] font-medium transition-colors
                    ${esSeleccionado
                      ? 'bg-[#2563EB] text-white'
                      : esHoy
                      ? 'bg-blue-100 text-[#2563EB] font-bold'
                      : esMesActual
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {format(d, 'd')}
                  {tieneCitas && !esSeleccionado && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2563EB] opacity-60" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Próximas citas del día seleccionado */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
          {isSameDay(fechaSeleccionada, hoy) ? 'Hoy' : format(fechaSeleccionada, "d 'de' MMM", { locale: es })}
        </p>
        <div className="space-y-1">
          {citas
            .filter(
              (c) =>
                isSameDay(new Date(c.inicio.slice(0, 10) + 'T00:00:00'), fechaSeleccionada) &&
                c.estado !== 'cancelada' &&
                c.estado !== 'no_asistio'
            )
            .sort((a, b) => a.inicio.localeCompare(b.inicio))
            .slice(0, 5)
            .map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-default"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: c.profesionales?.color ?? '#2563EB' }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 truncate">
                    {c.inicio.slice(11, 16)} {c.pacientes?.nombre ?? 'Paciente'}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{c.servicios?.nombre}</p>
                </div>
              </div>
            ))}
          {citas.filter(
            (c) =>
              isSameDay(new Date(c.inicio.slice(0, 10) + 'T00:00:00'), fechaSeleccionada) &&
              c.estado !== 'cancelada' &&
              c.estado !== 'no_asistio'
          ).length === 0 && (
            <p className="text-[11px] text-gray-400 px-1">Sin citas</p>
          )}
        </div>
      </div>
    </div>
  )
}
