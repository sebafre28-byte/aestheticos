import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createFlowSubscription, getCardRegisterStatus } from '@/lib/subscriptions/flow'
import type { Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const clinica_id = searchParams.get('clinica_id')
  const plan       = searchParams.get('plan') as Plan
  const anual      = searchParams.get('anual') === 'true'
  const token      = searchParams.get('token')

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

    // Obtener info de tarjeta registrada
    let card_last4: string | null = null
    let card_type: string | null = null
    if (token) {
      try {
        const cardStatus = await getCardRegisterStatus(token)
        if (cardStatus.status === '1') {
          card_last4 = cardStatus.last4CardDigits ?? null
          card_type  = cardStatus.creditCardType ?? null
        }
      } catch { /* no bloquear si falla */ }
    }

    const { subscriptionId } = await createFlowSubscription(sub.flow_customer_id, plan, anual)

    await db.from('subscriptions').update({
      flow_subscription_id: subscriptionId,
      plan,
      estado: 'activa',
      billing_period: anual ? 'anual' : 'mensual',
      ...(card_last4 ? { card_last4, card_type } : {}),
      updated_at: new Date().toISOString(),
    }).eq('clinica_id', clinica_id)

    return NextResponse.redirect(new URL('/configuracion?tab=plan&checkout=success', origin))
  } catch (err) {
    console.error('[flow/subscription-confirm]', err)
    return NextResponse.redirect(new URL('/configuracion?tab=plan&error=suscripcion', origin))
  }
}
