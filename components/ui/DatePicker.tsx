'use client'

import { useState, useRef, useEffect } from 'react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay,
  isToday, isBefore, startOfDay, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface DatePickerProps {
  value: string        // 'yyyy-MM-dd'
  onChange: (v: string) => void
  min?: string         // 'yyyy-MM-dd'
  className?: string
}

export function DatePicker({ value, onChange, min, className = '' }: DatePickerProps) {
  const selected   = value   ? parseISO(value)   : null
  const minDate    = min     ? parseISO(min)      : null
  const [open, setOpen]         = useState(false)
  const [cursor, setCursor]     = useState(selected ?? new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const monthStart  = startOfMonth(cursor)
  const monthEnd    = endOfMonth(cursor)
  const gridStart   = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 })

  const days: Date[] = []
  let d = gridStart
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1) }

  function select(day: Date) {
    if (minDate && isBefore(startOfDay(day), startOfDay(minDate))) return
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const displayLabel = selected
    ? format(selected, "d 'de' MMMM, yyyy", { locale: es })
    : 'Seleccionar fecha'

  const monthLabel = format(cursor, 'MMMM yyyy', { locale: es })
    .replace(/^\w/, c => c.toUpperCase())

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white flex items-center gap-2 text-[13px] text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all"
      >
        <CalendarDays className="size-3.5 text-gray-400 shrink-0" />
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{displayLabel}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setCursor(subMonths(cursor, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[13px] font-semibold text-gray-800">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-1">
            {['L','M','X','J','V','S','D'].map(n => (
              <div key={n} className="text-center text-[10px] font-semibold text-gray-400 py-1">{n}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day, i) => {
              const isSelected  = selected && isSameDay(day, selected)
              const isThisMonth = isSameMonth(day, cursor)
              const isDisabled  = minDate ? isBefore(startOfDay(day), startOfDay(minDate)) : false
              const todayMark   = isToday(day)

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => select(day)}
                  disabled={isDisabled}
                  className={[
                    'h-8 w-full rounded-lg text-[12px] font-medium transition-all',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : todayMark && isThisMonth
                      ? 'bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-300'
                      : isThisMonth && !isDisabled
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-300 cursor-default',
                    isDisabled ? 'opacity-30 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => { setCursor(new Date()); select(new Date()) }}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
