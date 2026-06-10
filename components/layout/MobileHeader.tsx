'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import { getClinicaBasica } from '@/lib/onboarding/queries'
import { NotificationBell } from '@/components/layout/NotificationBell'

type Props = {
  onOpenSidebar: () => void
}

export function MobileHeader({ onOpenSidebar }: Props) {
  const [logoClinica, setLogoClinica] = useState('')
  const [nombreClinica, setNombreClinica] = useState('')

  useEffect(() => {
    getClinicaBasica().then((c) => {
      if (c) {
        setLogoClinica(c.logo_url ?? '')
        setNombreClinica(c.nombre ?? '')
      }
    })
    const handler = () => getClinicaBasica().then((c) => {
      if (c) { setLogoClinica(c.logo_url ?? ''); setNombreClinica(c.nombre ?? '') }
    })
    window.addEventListener('clinica-updated', handler)
    return () => window.removeEventListener('clinica-updated', handler)
  }, [])

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
      <div className="flex items-center gap-2 min-w-0">
        {logoClinica ? (
          <Image
            src={logoClinica}
            alt={nombreClinica}
            width={28}
            height={28}
            className="rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-white/10 flex-shrink-0" />
        )}
        <span className="text-[15px] font-bold text-white leading-tight tracking-tight truncate">
          {nombreClinica || 'SimpliClinic'}
        </span>
      </div>
      <div className="ml-auto -mr-1">
        <NotificationBell dark />
      </div>
    </header>
  )
}
