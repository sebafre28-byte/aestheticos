import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPERADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const db = createAdminClient()

  const { data: clinicas } = await db
    .from('clinicas')
    .select('id, nombre, email, created_at, activo, owner_id')
    .order('created_at', { ascending: false })

  const { data: subscriptions } = await db
    .from('subscriptions')
    .select('clinica_id, plan, estado, trial_ends_at, current_period_end, flow_subscription_id, card_last4, updated_at')

  const { data: citas_count } = await db
    .from('citas')
    .select('clinica_id')

  const subMap = Object.fromEntries((subscriptions ?? []).map(s => [s.clinica_id, s]))
  const citasMap: Record<string, number> = {}
  for (const c of citas_count ?? []) {
    citasMap[c.clinica_id] = (citasMap[c.clinica_id] ?? 0) + 1
  }

  const result = (clinicas ?? []).map(c => ({
    ...c,
    subscription: subMap[c.id] ?? null,
    total_citas: citasMap[c.id] ?? 0,
  }))

  return NextResponse.json({ clinicas: result })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPERADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const db = createAdminClient()
  const body = await request.json() as { clinica_id: string; action: string; value?: string }
  const { clinica_id, action, value } = body

  if (action === 'extend_trial') {
    const days = parseInt(value ?? '7')
    const newDate = new Date()
    newDate.setDate(newDate.getDate() + days)
    await db.from('subscriptions').update({
      estado: 'trial',
      trial_ends_at: newDate.toISOString(),
    }).eq('clinica_id', clinica_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_plan') {
    await db.from('subscriptions').update({ plan: value, estado: 'activa' }).eq('clinica_id', clinica_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_activo') {
    const { data: c } = await db.from('clinicas').select('activo').eq('id', clinica_id).single()
    await db.from('clinicas').update({ activo: !c?.activo }).eq('id', clinica_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
