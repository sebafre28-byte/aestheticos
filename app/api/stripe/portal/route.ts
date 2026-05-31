import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCustomerPortalSession } from '@/lib/subscriptions/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { clinica_id } = body as { clinica_id?: string }

    if (!clinica_id) {
      return NextResponse.json({ error: 'clinica_id es requerido' }, { status: 400 })
    }

    // Fetch stripe_customer_id from subscriptions using admin client
    const admin = createAdminClient()
    const { data: sub, error } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('clinica_id', clinica_id)
      .maybeSingle()

    if (error || !sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No hay suscripción activa con Stripe para esta clínica' },
        { status: 404 },
      )
    }

    const returnUrl = `${request.nextUrl.origin}/configuracion`
    const { url } = await createCustomerPortalSession(sub.stripe_customer_id, returnUrl)

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[stripe/portal]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
