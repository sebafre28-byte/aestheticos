'use client'

import { endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { citaWallClockDate, citaWallClockTime } from '@/lib/agenda/datetime'
import type { CitaConRelaciones, BloqueoProfesional } from '@/lib/agenda/queries'

type Props = {
  fechaBase: Date
  citas: CitaConRelaciones[]
  bloqueos?: BloqueoProfesional[]
  onVerDia: (fecha: Date) => void
  onClickCita: (cita: CitaConRelaciones) => void
}

export function CalendarioMes({ fechaBase, citas, bloqueos = [], onVerDia, onClickCita }: Props) {
  const monthStart = startOfMonth(fechaBase)
  const monthEnd = endOfMonth(fechaBase)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let cursor = calendarStart
  while (cursor <= calendarEnd) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return (
    <div className="h-full bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr flex-1 min-h-0">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const citasDia = citas
            .filter((c) => citaWallClockDate(c.inicio) === dayKey)
            .sort((a, b) => a.inicio.localeCompare(b.inicio))
          const bloqueosDia = bloqueos.filter((b) =>
            b.inicio < `${dayKey}T23:59:59` && b.fin > `${dayKey}T00:00:00`
          )
          return (
            <button
              key={dayKey}
              onClick={() => onVerDia(day)}
              className={`border-r border-b border-gray-100 p-2 text-left align-top min-h-[110px] hover:bg-gray-50 transition-colors ${
                !isSameMonth(day, monthStart) ? 'bg-gray-50/50' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${
                    isToday(day) ? 'bg-[#2563EB] text-white' : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd', { locale: es })}
                </span>
                {bloqueosDia.length > 0 && (
                  <span className="text-[9px] font-medium text-gray-400 bg-gray-100 rounded px-1 py-0.5">
                    🔒 {bloqueosDia.length}
                  </span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {citasDia.slice(0, 3).map((cita) => (
                  <div
                    key={cita.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onClickCita(cita)
                    }}
                    className="text-[10px] rounded px-1.5 py-1 truncate"
                    style={{ backgroundColor: `${cita.profesionales?.color ?? '#2563EB'}22`, color: cita.profesionales?.color ?? '#2563EB' }}
                  >
                    {citaWallClockTime(cita.inicio)} · {cita.pacientes?.nombre}
                  </div>
                ))}
                {citasDia.length > 3 && (
                  <p className="text-[10px] text-gray-500">+{citasDia.length - 3} más</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
