import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS, type Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPERADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

export async function GET() {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createAdminClient()

  const [{ data: clinicas }, { data: subscriptions }, { data: citas }, { data: pacientes }, { data: profesionales }] = await Promise.all([
    db.from('clinicas').select('id, nombre, email, created_at, activo, owner_id, configuracion').order('created_at', { ascending: false }),
    db.from('subscriptions').select('clinica_id, plan, estado, trial_ends_at, current_period_end, flow_subscription_id, card_last4, card_type, anual, updated_at'),
    db.from('citas').select('clinica_id, created_at'),
    db.from('pacientes').select('clinica_id'),
    db.from('profesionales').select('clinica_id, activo'),
  ])

  const subMap = Object.fromEntries((subscriptions ?? []).map(s => [s.clinica_id, s]))

  const citasTotal: Record<string, number> = {}
  const citasMes: Record<string, number> = {}
  const mesActual = new Date().toISOString().slice(0, 7)
  for (const c of citas ?? []) {
    citasTotal[c.clinica_id] = (citasTotal[c.clinica_id] ?? 0) + 1
    if (c.created_at?.startsWith(mesActual)) {
      citasMes[c.clinica_id] = (citasMes[c.clinica_id] ?? 0) + 1
    }
  }

  const pacientesCount: Record<string, number> = {}
  for (const p of pacientes ?? []) {
    pacientesCount[p.clinica_id] = (pacientesCount[p.clinica_id] ?? 0) + 1
  }

  const profsCount: Record<string, number> = {}
  for (const p of profesionales ?? []) {
    if (p.activo) profsCount[p.clinica_id] = (profsCount[p.clinica_id] ?? 0) + 1
  }

  const result = (clinicas ?? []).map(c => {
    const sub = subMap[c.id] ?? null
    const plan = (sub?.plan ?? 'free') as Plan
    return {
      ...c,
      subscription: sub,
      uso: {
        profesionales: profsCount[c.id] ?? 0,
        pacientes: pacientesCount[c.id] ?? 0,
        citas_mes: citasMes[c.id] ?? 0,
        citas_total: citasTotal[c.id] ?? 0,
      },
      limites: PLAN_LIMITS[plan] ?? PLAN_LIMITS.free,
    }
  })

  return NextResponse.json({ clinicas: result })
}

export async function PATCH(request: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createAdminClient()
  const body = await request.json() as { clinica_id: string; action: string; value?: string; feature_key?: string }
  const { clinica_id, action, value, feature_key } = body

  if (action === 'extend_trial') {
    const days = parseInt(value ?? '7')
    const newDate = new Date()
    newDate.setDate(newDate.getDate() + days)
    await db.from('subscriptions').update({ estado: 'trial', trial_ends_at: newDate.toISOString() }).eq('clinica_id', clinica_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set_plan') {
    const plans: Plan[] = ['free', 'pro', 'clinica']
    if (!plans.includes(value as Plan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    await db.from('subscriptions').update({ plan: value, estado: 'activa' }).eq('clinica_id', clinica_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_activo') {
    const { data: c } = await db.from('clinicas').select('activo').eq('id', clinica_id).single()
    const nuevoActivo = !c?.activo
    await db.from('clinicas').update({ activo: nuevoActivo }).eq('id', clinica_id)
    // Sync subscription estado
    if (!nuevoActivo) {
      await db.from('subscriptions').update({ estado: 'pausada' }).eq('clinica_id', clinica_id)
    } else {
      // Reactivate to trial if it was paused (not cancelled)
      const { data: sub } = await db.from('subscriptions').select('estado').eq('clinica_id', clinica_id).single()
      if (sub?.estado === 'pausada') {
        await db.from('subscriptions').update({ estado: 'trial' }).eq('clinica_id', clinica_id)
      }
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_feature') {
    if (!feature_key) return NextResponse.json({ error: 'feature_key requerido' }, { status: 400 })
    const { data: clinica } = await db.from('clinicas').select('configuracion').eq('id', clinica_id).single()
    const cfg = (clinica?.configuracion ?? {}) as Record<string, unknown>
    const features = (cfg.features ?? {}) as Record<string, boolean>
    const enabled = value === 'true'
    await db.from('clinicas').update({
      configuracion: { ...cfg, features: { ...features, [feature_key]: enabled } },
    }).eq('id', clinica_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'impersonate') {
    // Get the owner/admin email for the clinic
    const { data: uc } = await db
      .from('usuarios_clinica')
      .select('user_id')
      .eq('clinica_id', clinica_id)
      .eq('rol', 'admin')
      .limit(1)
      .maybeSingle()
    if (!uc) return NextResponse.json({ error: 'No se encontró admin de la clínica' }, { status: 404 })

    const { data: authUser } = await db.auth.admin.getUserById(uc.user_id)
    if (!authUser?.user?.email) return NextResponse.json({ error: 'No se pudo obtener email del admin' }, { status: 404 })

    const { data: link, error: linkErr } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    })
    if (linkErr || !link) return NextResponse.json({ error: 'Error generando link' }, { status: 500 })

    return NextResponse.json({ link: link.properties?.action_link ?? null })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
