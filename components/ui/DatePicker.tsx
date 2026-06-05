'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay,
  isToday, isBefore, startOfDay, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface DatePickerProps {
  value: string                         // 'yyyy-MM-dd'
  onChange: (v: string) => void
  min?: string                          // 'yyyy-MM-dd' — disables dates before this
  disabledDays?: (date: Date) => boolean // extra disabled logic (e.g. professional days off)
  className?: string
}

export function DatePicker({ value, onChange, min, disabledDays, className = '' }: DatePickerProps) {
  const selected = value ? parseISO(value) : null
  const minDate  = min   ? parseISO(min)   : null

  const [open, setOpen]     = useState(false)
  const [cursor, setCursor] = useState(selected ?? new Date())
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 280 })

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)

  // Position dropdown under the trigger using viewport coords
  function openDropdown() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropPos({
        top:   r.bottom + window.scrollY + 4,
        left:  r.left   + window.scrollX,
        width: Math.max(r.width, 280),
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const monthStart = startOfMonth(cursor)
  const monthEnd   = endOfMonth(cursor)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })

  const days: Date[] = []
  let d = gridStart
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1) }

  function isDisabled(day: Date) {
    if (minDate && isBefore(startOfDay(day), startOfDay(minDate))) return true
    if (disabledDays?.(day)) return true
    return false
  }

  function select(day: Date) {
    if (isDisabled(day)) return
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const displayLabel = selected
    ? format(selected, "d 'de' MMMM, yyyy", { locale: es })
    : 'Seleccionar fecha'

  const monthLabel = format(cursor, 'MMMM yyyy', { locale: es })
    .replace(/^\w/, c => c.toUpperCase())

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setCursor(subMonths(cursor, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[13px] font-semibold text-gray-800">{monthLabel}</span>
        <button type="button" onClick={() => setCursor(addMonths(cursor, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
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
          const sel     = selected && isSameDay(day, selected)
          const inMonth = isSameMonth(day, cursor)
          const disabled = isDisabled(day)
          const todayMark = isToday(day)

          return (
            <button
              key={i}
              type="button"
              onClick={() => select(day)}
              disabled={disabled}
              className={[
                'h-8 w-full rounded-lg text-[12px] font-medium transition-all',
                sel
                  ? 'bg-blue-600 text-white shadow-sm'
                  : disabled
                  ? 'text-gray-200 cursor-not-allowed line-through'
                  : todayMark && inMonth
                  ? 'bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-300 hover:bg-blue-100'
                  : inMonth
                  ? 'text-gray-700 hover:bg-gray-100'
                  : 'text-gray-300',
              ].join(' ')}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
        <button type="button"
          onClick={() => { const today = new Date(); setCursor(today); select(today) }}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
          Hoy
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white flex items-center gap-2 text-[13px] text-gray-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all"
      >
        <CalendarDays className="size-3.5 text-gray-400 shrink-0" />
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{displayLabel}</span>
      </button>

      {typeof window !== 'undefined' && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  )
}
