'use client'

import { Menu } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

type Props = {
  onOpenSidebar: () => void
}

export function MobileHeader({ onOpenSidebar }: Props) {
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-white/10"
      style={{ backgroundColor: '#0B132B' }}
    >
      <button
        onClick={onOpenSidebar}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors -ml-1"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>
      <div className="flex items-center gap-2 flex-1">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="9" fill="white" />
          <rect x="13" y="7" width="6" height="18" rx="3" fill="#2563EB" />
          <rect x="7" y="13" width="18" height="6" rx="3" fill="#2563EB" />
        </svg>
        <span className="text-[15px] font-bold text-white leading-tight tracking-tight">SimpliClinic</span>
      </div>
      <NotificationBell />
    </header>
  )
}
