'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'

export function TrialBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { esTrial, trialDiasRestantes, trialVencido, cargando } = useSubscripcion()

  if (cargando || dismissed || !esTrial) return null

  const urgente = trialVencido || (trialDiasRestantes !== null && trialDiasRestantes <= 3)

  const bg = trialVencido
    ? 'bg-red-600'
    : urgente
    ? 'bg-amber-500'
    : 'bg-[#0B132B]'

  const mensaje = trialVencido
    ? 'Tu prueba venció — activa un plan para seguir'
    : `🎉 Estás en tu período de prueba — ${trialDiasRestantes} ${trialDiasRestantes === 1 ? 'día restante' : 'días restantes'}`

  return (
    <div className={`${bg} text-white py-2 px-4 flex items-center justify-between gap-4 text-[13px]`}>
      <span className="flex-1 text-center font-medium">{mensaje}</span>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/configuracion?tab=plan"
          className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full text-[12px] font-semibold"
        >
          Activar plan
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
