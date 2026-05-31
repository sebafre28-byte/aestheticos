'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Plan = 'free' | 'pro' | 'clinica'
type Estado = 'activa' | 'pausada' | 'cancelada' | 'trial'

type SubscripcionState = {
  plan: Plan | null
  estado: Estado | null
  trialDiasRestantes: number | null
  esTrial: boolean
  trialVencido: boolean
  cargando: boolean
  puedeUsar: (feature: string) => boolean
}

const FEATURES: Record<string, Plan[]> = {
  whatsapp:                ['pro', 'clinica'],
  inbox:                   ['pro', 'clinica'],
  reportes:                ['pro', 'clinica'],
  booking_publico:         ['pro', 'clinica'],
  agenda_semana:           ['pro', 'clinica'],
  agenda_mes:              ['pro', 'clinica'],
  multiples_profesionales: ['pro', 'clinica'],
}

let cache: SubscripcionState | null = null

export function useSubscripcion(): SubscripcionState {
  const [state, setState] = useState<SubscripcionState>(
    cache ?? {
      plan: null,
      estado: null,
      trialDiasRestantes: null,
      esTrial: false,
      trialVencido: false,
      cargando: true,
      puedeUsar: () => false,
    }
  )

  useEffect(() => {
    if (cache) {
      setState(cache)
      return
    }

    const supabase = createClient()
    supabase
      .from('subscriptions')
      .select('*')
      .single()
      .then(({ data }) => {
        const plan = (data?.plan ?? null) as Plan | null
        const estado = (data?.estado ?? null) as Estado | null
        const esTrial = estado === 'trial'
        let trialDiasRestantes: number | null = null
        let trialVencido = false

        if (esTrial && data?.trial_ends_at) {
          const diff = new Date(data.trial_ends_at).getTime() - Date.now()
          const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
          trialDiasRestantes = Math.max(0, dias)
          trialVencido = dias <= 0
        }

        const trialActivo = esTrial && !trialVencido

        function puedeUsar(feature: string): boolean {
          if (trialActivo) return true
          if (!plan) return false
          const requeridos = FEATURES[feature]
          if (!requeridos) return true
          return requeridos.includes(plan)
        }

        const next: SubscripcionState = {
          plan,
          estado,
          trialDiasRestantes,
          esTrial,
          trialVencido,
          cargando: false,
          puedeUsar,
        }
        cache = next
        setState(next)
      })
  }, [])

  return state
}
