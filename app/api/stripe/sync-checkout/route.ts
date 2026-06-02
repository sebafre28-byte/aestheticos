import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const STRIPE_API = 'https://api.stripe.com/v1'

function stripeHeaders() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurado')
  return { Authorization: `Bearer ${key}` }
}

// Called after checkout=success to sync subscription without relying on webhook
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { clinica_id } = await request.json() as { clinica_id?: string }
    if (!clinica_id) return NextResponse.json({ error: 'clinica_id requerido' }, { status: 400 })

    // List recent checkout sessions for this clinica
    const url = new URL(`${STRIPE_API}/checkout/sessions`)
    url.searchParams.set('limit', '5')
    url.searchParams.set('status', 'complete')

    const res = await fetch(url.toString(), { headers: stripeHeaders() })
    const json = await res.json() as { data: Array<{
      id: string
      payment_status: string
      metadata?: { clinica_id?: string; plan?: string }
      customer?: string
      subscription?: string
    }> }

    if (!res.ok) throw new Error(`Stripe error: ${JSON.stringify(json)}`)

    // Find session matching this clinica_id
    const session = json.data.find(
      s => s.metadata?.clinica_id === clinica_id && s.payment_status === 'paid'
    )

    if (!session) {
      return NextResponse.json({ synced: false, reason: 'No se encontró sesión pagada' })
    }

    const plan = session.metadata?.plan
    if (!plan) return NextResponse.json({ synced: false, reason: 'Sin plan en metadata' })

    // Update subscription in DB directly
    const admin = createAdminClient()
    const { error } = await admin
      .from('subscriptions')
      .upsert(
        {
          clinica_id,
          plan,
          estado: 'activa',
          stripe_customer_id: session.customer ?? null,
          stripe_subscription_id: session.subscription ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clinica_id' }
      )

    if (error) throw error

    return NextResponse.json({ synced: true, plan })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[stripe/sync-checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
