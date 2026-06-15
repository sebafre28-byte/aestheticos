'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ScrollableTabsProps {
  children: React.ReactNode
  className?: string
}

export function ScrollableTabs({ children, className = '' }: ScrollableTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [checkScroll])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' })
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md border border-gray-100 text-gray-500 hover:text-gray-700 shrink-0"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {canScrollLeft && <span className="w-5 shrink-0" />}
        {children}
        {canScrollRight && <span className="w-5 shrink-0" />}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md border border-gray-100 text-gray-500 hover:text-gray-700 shrink-0"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="size-3.5" />
        </button>
      )}
    </div>
  )
}
