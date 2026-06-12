import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateFlowCustomer, createCardRegistrationUrl } from '@/lib/subscriptions/flow'
import type { Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { clinica_id, plan, anual } = await request.json() as { clinica_id?: string; plan?: Plan; anual?: boolean }
    if (!clinica_id || !plan) return NextResponse.json({ error: 'clinica_id y plan requeridos' }, { status: 400 })
    if (!['free', 'pro', 'clinica'].includes(plan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id, nombre, email')
      .eq('id', clinica_id)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!clinica) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const flowCustomerId = await getOrCreateFlowCustomer(
      clinica.email ?? user.email ?? '',
      clinica.nombre ?? '',
    )

    const db = createAdminClient()
    await db.from('subscriptions').upsert({
      clinica_id,
      flow_customer_id: flowCustomerId,
      plan,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'clinica_id' })

    const returnUrl = `${request.nextUrl.origin}/api/flow/subscription-confirm?clinica_id=${clinica_id}&plan=${plan}&anual=${anual ?? false}`
    const { url } = await createCardRegistrationUrl(flowCustomerId, returnUrl)

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[flow/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
