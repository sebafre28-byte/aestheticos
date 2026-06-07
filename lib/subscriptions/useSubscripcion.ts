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
  limite: (recurso: 'profesionales' | 'pacientes') => number
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

// Límites por plan. trial = mismos que pro. null = ilimitado
const LIMITES: Record<string, Record<'profesionales' | 'pacientes', number | null>> = {
  free:    { profesionales: 1,    pacientes: 50   },
  pro:     { profesionales: 5,    pacientes: 500  },
  clinica: { profesionales: null, pacientes: null },
  trial:   { profesionales: 5,    pacientes: 500  },
}

let cache: SubscripcionState | null = null

export function clearSubscripcionCache() {
  cache = null
}

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
      limite: () => Infinity,
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
      .maybeSingle()
      .then(({ data }) => {
        const plan = (data?.plan ?? null) as Plan | null
        const estado = (data?.estado ?? null) as Estado | null
        const esTrial = estado === 'trial'
        let trialDiasRestantes: number | null = null
        let trialVencido = false

        if (esTrial) {
          const endsAt = data?.trial_ends_at
            ? new Date(data.trial_ends_at)
            : new Date(new Date(data?.created_at ?? Date.now()).getTime() + 7 * 24 * 60 * 60 * 1000)
          const diff = endsAt.getTime() - Date.now()
          const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
          trialDiasRestantes = Math.max(0, dias)
          trialVencido = dias <= 0
        }

        const trialActivo = esTrial && !trialVencido

        function puedeUsar(feature: string): boolean {
          if (trialActivo) return true
          if (!plan) return false
          if (estado === 'pausada' || estado === 'cancelada') return false
          const requeridos = FEATURES[feature]
          if (!requeridos) return true
          return requeridos.includes(plan)
        }

        function limite(recurso: 'profesionales' | 'pacientes'): number {
          const planKey = trialActivo ? 'trial' : (plan ?? 'free')
          const val = LIMITES[planKey]?.[recurso]
          return val ?? Infinity
        }

        const next: SubscripcionState = {
          plan,
          estado,
          trialDiasRestantes,
          esTrial,
          trialVencido,
          cargando: false,
          puedeUsar,
          limite,
        }
        cache = next
        setState(next)
      })
  }, [])

  return state
}
