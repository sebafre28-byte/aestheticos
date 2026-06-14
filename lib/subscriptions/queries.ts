'use client'

import { createClient } from '@/lib/supabase/client'
import { getClinicaId } from '@/lib/onboarding/queries'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro' | 'clinica'
export type EstadoSuscripcion = 'activa' | 'pausada' | 'cancelada' | 'trial'

export type Subscription = {
  id: string
  clinica_id: string
  plan: Plan
  estado: EstadoSuscripcion
  stripe_customer_id: string | null
  flow_customer_id: string | null
  flow_subscription_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  conv_ia_usadas: number
  conv_ia_mes: string | null
  created_at: string
  updated_at: string
}

// ─── Plan metadata ────────────────────────────────────────────────────────────

export type PlanLimits = {
  profesionales: number   // -1 = ilimitado
  pacientes: number       // -1 = ilimitado
  conversaciones_ia: number  // 0 = sin acceso, -1 = ilimitado
  usuarios: number        // -1 = ilimitado
  storage_gb: number      // -1 = ilimitado
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:    { profesionales: 1,  pacientes: 200,  conversaciones_ia: 0,    usuarios: 2,  storage_gb: 5   },
  pro:     { profesionales: 5,  pacientes: 1000, conversaciones_ia: 300,  usuarios: 10, storage_gb: 25  },
  clinica: { profesionales: -1, pacientes: 5000, conversaciones_ia: 1000, usuarios: -1, storage_gb: 100 },
}

export const PLAN_LABELS: Record<Plan, string> = {
  free:    'Simpli',
  pro:     'Simpli+',
  clinica: 'Simpli Pro',
}

// Precios mensuales en CLP (sin IVA)
export const PLAN_PRICES: Record<Plan, number> = {
  free:    29900,
  pro:     59900,
  clinica: 99900,
}

// Precio anual (20% descuento, pago único)
export const PLAN_PRICES_ANUAL: Record<Plan, number> = {
  free:    287000,   // 29.900 × 12 × 0.8
  pro:     575000,   // 59.900 × 12 × 0.8
  clinica: 959000,   // 99.900 × 12 × 0.8
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getSubscription(): Promise<Subscription | null> {
  const clinicaId = await getClinicaId()
  if (!clinicaId) {
    console.error('getSubscription: sin sesión activa')
    return null
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('clinica_id', clinicaId)
    .maybeSingle()

  if (error) {
    console.error('Error getSubscription:', error)
    return null
  }

  return data as Subscription | null
}
