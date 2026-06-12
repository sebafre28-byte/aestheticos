import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFlowSubscription } from '@/lib/subscriptions/flow'
import type { Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const clinica_id = searchParams.get('clinica_id')
  const plan       = searchParams.get('plan') as Plan
  const anual      = searchParams.get('anual') === 'true'

  if (!clinica_id || !plan) {
    return NextResponse.redirect(new URL('/configuracion?tab=plan&error=parametros', origin))
  }

  try {
    const db = createAdminClient()
    const { data: sub } = await db
      .from('subscriptions')
      .select('flow_customer_id')
      .eq('clinica_id', clinica_id)
      .single()

    if (!sub?.flow_customer_id) throw new Error('Sin customer ID de Flow')

    const { subscriptionId } = await createFlowSubscription(sub.flow_customer_id, plan, anual)

    await db.from('subscriptions').update({
      flow_subscription_id: subscriptionId,
      plan,
      estado: 'activa',
      updated_at: new Date().toISOString(),
    }).eq('clinica_id', clinica_id)

    return NextResponse.redirect(new URL('/configuracion?tab=plan&checkout=success', origin))
  } catch (err) {
    console.error('[flow/subscription-confirm]', err)
    return NextResponse.redirect(new URL('/configuracion?tab=plan&error=suscripcion', origin))
  }
}
