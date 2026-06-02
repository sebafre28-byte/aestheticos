import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/subscriptions/stripe'
import type { Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { clinica_id, plan } = body as { clinica_id?: string; plan?: Plan }

    if (!clinica_id || !plan) {
      return NextResponse.json({ error: 'clinica_id y plan son requeridos' }, { status: 400 })
    }

    if (!['pro', 'clinica'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // Verify clinica_id belongs to the authenticated user
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id')
      .eq('id', clinica_id)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!clinica) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const returnUrl = `${request.nextUrl.origin}/configuracion`
    const { url } = await createCheckoutSession(clinica_id, plan, returnUrl)

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[stripe/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
