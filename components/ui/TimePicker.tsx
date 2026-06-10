'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

interface TimePickerProps {
  value: string          // 'HH:mm'
  onChange: (v: string) => void
  slots: string[]        // all available time slots
  className?: string
  hasError?: boolean
}

export function TimePicker({ value, onChange, slots, className = '', hasError }: TimePickerProps) {
  const [open, setOpen]       = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 120 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const listRef    = useRef<HTMLDivElement>(null)

  function openDropdown() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 120) })
    }
    setOpen(true)
  }

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (el) el.scrollIntoView({ block: 'center' })
    }
  }, [open])

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

  const dropdown = open ? (
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
    >
      <div ref={listRef} className="max-h-56 overflow-y-auto py-1">
        {slots.map(slot => {
          const isSelected = slot === value
          return (
            <button
              key={slot}
              type="button"
              data-selected={isSelected}
              onClick={() => { onChange(slot); setOpen(false) }}
              className={[
                'w-full text-left px-3 py-1.5 text-[12px] font-medium transition-colors',
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {slot}
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className={[
          'h-9 px-3 rounded-xl border bg-white flex items-center gap-1.5 text-[13px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/30',
          hasError
            ? 'border-red-300 text-red-700'
            : 'border-gray-200 text-blue-600 hover:border-blue-400',
        ].join(' ')}
      >
        <Clock className="size-3 shrink-0 opacity-60" />
        {value}
      </button>

      {typeof window !== 'undefined' && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  )
}
