import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCardRegistrationUrl } from '@/lib/subscriptions/flow'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { clinica_id } = await request.json() as { clinica_id?: string }
    if (!clinica_id) return NextResponse.json({ error: 'clinica_id requerido' }, { status: 400 })

    const db = createAdminClient()
    const { data: sub } = await db.from('subscriptions').select('flow_customer_id').eq('clinica_id', clinica_id).single()
    if (!sub?.flow_customer_id) return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 })

    const returnUrl = `${request.nextUrl.origin}/configuracion?tab=plan`
    const { url } = await createCardRegistrationUrl(sub.flow_customer_id, returnUrl)

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
