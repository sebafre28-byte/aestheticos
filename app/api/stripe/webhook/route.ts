import { NextResponse, type NextRequest } from 'next/server'
import { handleStripeWebhook } from '@/lib/subscriptions/stripe'

export const runtime = 'nodejs'

// Stripe requires the raw body for signature verification
export async function POST(request: NextRequest) {
  try {
    const body      = await request.text()
    const signature = request.headers.get('stripe-signature') ?? ''

    const { handled, error } = await handleStripeWebhook(body, signature)

    if (!handled) {
      console.error('[stripe/webhook] No procesado:', error)
      return NextResponse.json({ error: error ?? 'No procesado' }, { status: 400 })
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[stripe/webhook]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
