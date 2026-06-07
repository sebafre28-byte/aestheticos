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

    const body = await request.json() as { clinica_id?: string; session_id?: string }
    const { clinica_id, session_id } = body
    if (!clinica_id) return NextResponse.json({ error: 'clinica_id requerido' }, { status: 400 })

    // Verify clinica_id belongs to the authenticated user
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id')
      .eq('id', clinica_id)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!clinica) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    // If a session_id is available, fetch it directly; otherwise list recent sessions
    let session: { id: string; payment_status: string; metadata?: { clinica_id?: string; plan?: string }; customer?: string; subscription?: string } | undefined

    if (session_id) {
      const sessionUrl = `${STRIPE_API}/checkout/sessions/${encodeURIComponent(session_id)}`
      const res = await fetch(sessionUrl, { headers: stripeHeaders() })
      const json = await res.json() as { id: string; payment_status: string; metadata?: { clinica_id?: string; plan?: string }; customer?: string; subscription?: string; error?: unknown }
      if (!res.ok) throw new Error(`Stripe error: ${JSON.stringify(json)}`)
      if (json.metadata?.clinica_id === clinica_id && json.payment_status === 'paid') {
        session = json
      }
    } else {
      const url = new URL(`${STRIPE_API}/checkout/sessions`)
      url.searchParams.set('limit', '25')
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
      session = json.data.find(
        s => s.metadata?.clinica_id === clinica_id && s.payment_status === 'paid'
      )
    }

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
