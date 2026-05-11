'use client'

import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogA11y(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose?: () => void
) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const previousActive = document.activeElement as HTMLElement | null
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    ;(focusables[0] ?? container).focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && onClose) {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const currentFocusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (currentFocusables.length === 0) return

      const first = currentFocusables[0]
      const last = currentFocusables[currentFocusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousActive?.focus()
    }
  }, [containerRef, onClose])
}
