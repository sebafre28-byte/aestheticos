'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'

const FEATURE_LABELS: Record<string, string> = {
  whatsapp:   'WhatsApp',
  reportes:   'Reportes',
  inbox:      'Inbox',
  agenda_semana: 'la vista de semana',
  agenda_mes:    'la vista de mes',
}

export function TrialFeatureBanner({ feature }: { feature: string }) {
  const { esTrial, trialDiasRestantes, cargando } = useSubscripcion()

  if (cargando || !esTrial) return null

  const label = FEATURE_LABELS[feature] ?? feature
  const dias = trialDiasRestantes ?? 0

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800 mb-4">
      <Zap className="size-3.5 shrink-0 text-amber-500" />
      <p className="flex-1">
        Estás usando <strong>{label}</strong> en tu período de prueba.
        {dias > 0
          ? ` Activa tu plan Pro para mantenerlo después de ${dias} ${dias === 1 ? 'día' : 'días'}.`
          : ' Activa tu plan Pro para seguir usándolo.'}
      </p>
      <Link
        href="/configuracion?tab=plan"
        className="shrink-0 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
      >
        Activar plan
      </Link>
    </div>
  )
}
