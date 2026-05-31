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
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// ─── Plan metadata ────────────────────────────────────────────────────────────

export type PlanLimits = {
  profesionales: number  // -1 = unlimited
  citas_mes: number      // -1 = unlimited
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free:    { profesionales: 1,  citas_mes: 50 },
  pro:     { profesionales: 5,  citas_mes: 500 },
  clinica: { profesionales: -1, citas_mes: -1 },
}

export const PLAN_LABELS: Record<Plan, string> = {
  free:    'Free',
  pro:     'Pro',
  clinica: 'Clínica',
}

export const PLAN_PRICES: Record<Plan, number> = {
  free:    0,
  pro:     29900,
  clinica: 59900,
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
