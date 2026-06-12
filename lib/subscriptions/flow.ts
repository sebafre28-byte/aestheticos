// ─── Flow.cl REST helpers (no SDK — uses native fetch + HMAC-SHA256) ──────────

import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Plan } from './queries'

const FLOW_API = process.env.FLOW_SANDBOX === '1'
  ? 'https://sandbox.flow.cl/api'
  : 'https://www.flow.cl/api'

function signParams(params: Record<string, string>): string {
  const secret = process.env.FLOW_SECRET_KEY
  if (!secret) throw new Error('FLOW_SECRET_KEY no configurado')
  const toSign = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  return createHmac('sha256', secret).update(toSign).digest('hex')
}

async function flowPost(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.FLOW_API_KEY
  if (!apiKey) throw new Error('FLOW_API_KEY no configurado')
  const allParams = { ...params, apiKey }
  const s = signParams(allParams)
  const body = new URLSearchParams({ ...allParams, s })
  const res = await fetch(`${FLOW_API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? `Flow error en ${endpoint}`)
  return json
}

async function flowGet(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.FLOW_API_KEY
  if (!apiKey) throw new Error('FLOW_API_KEY no configurado')
  const allParams = { ...params, apiKey }
  const s = signParams(allParams)
  const qs = new URLSearchParams({ ...allParams, s })
  const res = await fetch(`${FLOW_API}${endpoint}?${qs}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? `Flow error en ${endpoint}`)
  return json
}

// ─── Plan ID mapping ──────────────────────────────────────────────────────────

function getPlanId(plan: Plan, anual = false): string {
  if (anual) {
    const ids: Record<Plan, string | undefined> = {
      free:    process.env.FLOW_PLAN_FREE_ANUAL,
      pro:     process.env.FLOW_PLAN_PRO_ANUAL,
      clinica: process.env.FLOW_PLAN_CLINICA_ANUAL,
    }
    return ids[plan] ?? getPlanId(plan, false)
  }
  const ids: Record<Plan, string | undefined> = {
    free:    process.env.FLOW_PLAN_FREE,
    pro:     process.env.FLOW_PLAN_PRO,
    clinica: process.env.FLOW_PLAN_CLINICA,
  }
  const id = ids[plan]
  if (!id) throw new Error(`No hay Flow Plan ID para el plan: ${plan}`)
  return id
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export async function getOrCreateFlowCustomer(email: string, name: string): Promise<string> {
  try {
    const data = await flowPost('/customer/create', { email, name })
    return data.customerId
  } catch {
    // Ya existe — buscar por email
    const data = await flowGet('/customer/getByEmail', { email })
    return data.customerId
  }
}

export async function createCardRegistrationUrl(
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const data = await flowPost('/customer/register', {
    customerId,
    url_return: returnUrl,
  })
  return { url: `${data.url}?token=${data.token}` }
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function createFlowSubscription(
  customerId: string,
  plan: Plan,
  anual = false,
): Promise<{ subscriptionId: string }> {
  const planId = getPlanId(plan, anual)
  const data = await flowPost('/subscription/create', {
    planId,
    customerId,
    trial_period_days: '0',
  })
  return { subscriptionId: data.subscriptionId }
}

export async function cancelFlowSubscription(subscriptionId: string): Promise<void> {
  await flowPost('/subscription/cancel', { subscriptionId })
}

export async function changeFlowPlan(subscriptionId: string, plan: Plan, anual = false): Promise<void> {
  const planId = getPlanId(plan, anual)
  await flowPost('/subscription/changePlan', { subscriptionId, planId })
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function handleFlowWebhook(
  body: Record<string, string>,
): Promise<{ handled: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { event, subscriptionId } = body

  if (!event || !subscriptionId) {
    return { handled: false, error: 'Parámetros inválidos' }
  }

  switch (event) {
    case 'subscription_paid': {
      await supabase
        .from('subscriptions')
        .update({ estado: 'activa', updated_at: new Date().toISOString() })
        .eq('flow_subscription_id', subscriptionId)
      break
    }

    case 'subscription_payment_failed': {
      const { data: sub } = await supabase
        .from('subscriptions')
        .update({ estado: 'pausada', updated_at: new Date().toISOString() })
        .eq('flow_subscription_id', subscriptionId)
        .select('clinica_id, clinicas(email, nombre)')
        .single()
      if (sub) {
        const clinica = Array.isArray(sub.clinicas) ? sub.clinicas[0] : sub.clinicas
        const email = (clinica as { email?: string | null } | null)?.email
        const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? ''
        if (email) {
          const { dispatchEmail } = await import('@/app/api/email/route')
          dispatchEmail({ tipo: 'pago_fallido', destinatario: email, datos: { clinica_nombre: nombre } as never }).catch(() => {})
        }
      }
      break
    }

    case 'subscription_canceled': {
      const { data: sub } = await supabase
        .from('subscriptions')
        .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
        .eq('flow_subscription_id', subscriptionId)
        .select('clinica_id, clinicas(email, nombre)')
        .single()
      if (sub) {
        const clinica = Array.isArray(sub.clinicas) ? sub.clinicas[0] : sub.clinicas
        const email = (clinica as { email?: string | null } | null)?.email
        const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? ''
        if (email) {
          const { dispatchEmail } = await import('@/app/api/email/route')
          dispatchEmail({ tipo: 'suscripcion_cancelada', destinatario: email, datos: { clinica_nombre: nombre } as never }).catch(() => {})
        }
      }
      break
    }

    default:
      break
  }

  return { handled: true }
}
