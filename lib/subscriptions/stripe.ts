// ─── Stripe REST helpers (no stripe package — uses native fetch) ──────────────

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Plan } from './queries'

const STRIPE_API = 'https://api.stripe.com/v1'

function stripeHeaders() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurado')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
}

function toFormData(obj: Record<string, string | number | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

// ─── Plan → Stripe price ID mapping ──────────────────────────────────────────
// These env vars must be set with the actual Stripe price IDs
function getPriceId(plan: Plan): string {
  const ids: Record<Plan, string | undefined> = {
    free:    undefined,
    pro:     process.env.STRIPE_PRICE_PRO,
    clinica: process.env.STRIPE_PRICE_CLINICA,
  }
  const id = ids[plan]
  if (!id) throw new Error(`No hay precio de Stripe configurado para el plan: ${plan}`)
  return id
}

// ─── createCheckoutSession ────────────────────────────────────────────────────

export async function createCheckoutSession(
  clinicaId: string,
  plan: Plan,
  returnUrl: string,
): Promise<{ url: string }> {
  const priceId = getPriceId(plan)

  const body = toFormData({
    'line_items[0][price]':    priceId,
    'line_items[0][quantity]': 1,
    mode:                      'subscription',
    success_url:               `${returnUrl}?checkout=success`,
    cancel_url:                `${returnUrl}?checkout=cancel`,
    'metadata[clinica_id]':    clinicaId,
    'metadata[plan]':          plan,
    'subscription_data[metadata][clinica_id]': clinicaId,
    'subscription_data[metadata][plan]':       plan,
  })

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method:  'POST',
    headers: stripeHeaders(),
    body,
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`Stripe checkout error: ${json.error?.message ?? res.statusText}`)

  return { url: json.url }
}

// ─── createCustomerPortalSession ─────────────────────────────────────────────

export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const body = toFormData({
    customer:   stripeCustomerId,
    return_url: returnUrl,
  })

  const res = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
    method:  'POST',
    headers: stripeHeaders(),
    body,
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`Stripe portal error: ${json.error?.message ?? res.statusText}`)

  return { url: json.url }
}

// ─── Stripe webhook signature verification ────────────────────────────────────

function verifyStripeSignature(body: string, signature: string): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET no configurado')
    return false
  }

  // Stripe signature format: t=timestamp,v1=hash,...
  const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=')))
  const timestamp = parts['t']
  const v1 = parts['v1']
  if (!timestamp || !v1) return false

  const payload = `${timestamp}.${body}`
  const expected = createHmac('sha256', secret).update(payload).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'))
  } catch {
    return false
  }
}

// ─── handleStripeWebhook ──────────────────────────────────────────────────────

type StripeEvent = {
  type: string
  data: { object: Record<string, unknown> }
}

export async function handleStripeWebhook(
  body: string,
  signature: string,
): Promise<{ handled: boolean; error?: string }> {
  if (!verifyStripeSignature(body, signature)) {
    return { handled: false, error: 'Firma inválida' }
  }

  let event: StripeEvent
  try {
    event = JSON.parse(body)
  } catch {
    return { handled: false, error: 'JSON inválido' }
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        metadata?: { clinica_id?: string; plan?: string }
        customer?: string
        subscription?: string
      }
      const clinicaId = session.metadata?.clinica_id
      const plan      = session.metadata?.plan
      if (!clinicaId || !plan) break

      await supabase
        .from('subscriptions')
        .upsert(
          {
            clinica_id:             clinicaId,
            plan,
            estado:                 'activa',
            stripe_customer_id:     session.customer ?? null,
            stripe_subscription_id: session.subscription ?? null,
            updated_at:             new Date().toISOString(),
          },
          { onConflict: 'clinica_id' },
        )
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string
        status: string
        current_period_start: number
        current_period_end: number
        metadata?: { plan?: string }
      }
      const estadoMap: Record<string, string> = {
        active:   'activa',
        past_due: 'pausada',
        canceled: 'cancelada',
        trialing: 'trial',
        paused:   'pausada',
      }
      const estado = estadoMap[sub.status] ?? 'pausada'

      await supabase
        .from('subscriptions')
        .update({
          estado,
          plan:                  sub.metadata?.plan ?? undefined,
          current_period_start:  new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:    new Date(sub.current_period_end   * 1000).toISOString(),
          updated_at:            new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string }
      await supabase
        .from('subscriptions')
        .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string }
      if (!invoice.subscription) break
      await supabase
        .from('subscriptions')
        .update({ estado: 'pausada', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', invoice.subscription)
      break
    }

    case 'invoice.payment_action_required': {
      const invoice = event.data.object as { subscription?: string }
      if (!invoice.subscription) break
      await supabase
        .from('subscriptions')
        .update({ estado: 'pausada', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', invoice.subscription)
      break
    }

    default:
      // Unhandled event type — not an error
      break
  }

  return { handled: true }
}
