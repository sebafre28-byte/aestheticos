import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LIMITS, type Plan, type PlanLimits } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPERADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

// Merge plan defaults with per-clinic overrides
function efectiveLimites(plan: Plan, overrides: Partial<PlanLimits> | null): PlanLimits {
  return { ...PLAN_LIMITS[plan], ...(overrides ?? {}) }
}

// Append an entry to the audit log (fire-and-forget, non-blocking)
async function log(
  db: ReturnType<typeof createAdminClient>,
  clinica_id: string,
  admin_email: string,
  accion: string,
  campo?: string,
  valor_previo?: string | null,
  valor_nuevo?: string | null,
) {
  await db.from('superadmin_logs').insert({ clinica_id, admin_email, accion, campo, valor_previo, valor_nuevo })
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createAdminClient()

  const [
    { data: clinicas },
    { data: subscriptions },
    { data: citas },
    { data: pacientes },
    { data: profesionales },
  ] = await Promise.all([
    db.from('clinicas')
      .select('id, nombre, email, created_at, activo, owner_id, configuracion, notas_superadmin')
      .order('created_at', { ascending: false }),
    db.from('subscriptions')
      .select('clinica_id, plan, estado, trial_ends_at, current_period_end, flow_subscription_id, card_last4, card_type, billing_period, updated_at, conv_ia_usadas, conv_ia_mes, limit_overrides')
      .order('updated_at', { ascending: false }),
    db.from('citas').select('clinica_id, created_at'),
    db.from('pacientes').select('clinica_id'),
    db.from('profesionales').select('clinica_id, activo'),
  ])

  // Keep the most recently updated subscription per clinic
  type SubRow = NonNullable<typeof subscriptions>[number]
  const subMap: Record<string, SubRow> = {}
  for (const s of subscriptions ?? []) {
    if (!subMap[s.clinica_id]) subMap[s.clinica_id] = s
  }

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
    const overrides = (sub?.limit_overrides ?? null) as Partial<PlanLimits> | null
    return {
      ...c,
      subscription: sub,
      uso: {
        profesionales: profsCount[c.id] ?? 0,
        pacientes: pacientesCount[c.id] ?? 0,
        citas_mes: citasMes[c.id] ?? 0,
        citas_total: citasTotal[c.id] ?? 0,
        conv_ia_usadas: sub?.conv_ia_usadas ?? 0,
        conv_ia_mes: sub?.conv_ia_mes ?? null,
      },
      limites: efectiveLimites(plan, overrides),
      limit_overrides: overrides,
    }
  })

  return NextResponse.json({ clinicas: result })
}

// ─── GET logs for a single clinic ────────────────────────────────────────────

export async function GET_LOGS(clinica_id: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('superadmin_logs')
    .select('*')
    .eq('clinica_id', clinica_id)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createAdminClient()
  const body = await request.json() as {
    clinica_id: string
    action: string
    value?: string
    feature_key?: string
    limit_key?: keyof PlanLimits
  }
  const { clinica_id, action, value, feature_key, limit_key } = body

  // ── extend_trial ──────────────────────────────────────────────────────────
  if (action === 'extend_trial') {
    const days = parseInt(value ?? '7')
    const { data: prevSub } = await db.from('subscriptions').select('trial_ends_at, estado').eq('clinica_id', clinica_id).single()
    const newDate = new Date()
    newDate.setDate(newDate.getDate() + days)
    await db.from('subscriptions').update({ estado: 'trial', trial_ends_at: newDate.toISOString() }).eq('clinica_id', clinica_id)
    await log(db, clinica_id, user.email!, 'extend_trial', 'trial_ends_at', prevSub?.trial_ends_at ?? null, newDate.toISOString())
    return NextResponse.json({ ok: true })
  }

  // ── set_plan ──────────────────────────────────────────────────────────────
  if (action === 'set_plan') {
    const plans: Plan[] = ['free', 'pro', 'clinica']
    if (!plans.includes(value as Plan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    const { data: prevSub } = await db.from('subscriptions').select('plan').eq('clinica_id', clinica_id).single()
    await db.from('subscriptions').update({ plan: value, estado: 'activa' }).eq('clinica_id', clinica_id)
    await log(db, clinica_id, user.email!, 'set_plan', 'plan', prevSub?.plan ?? null, value)
    return NextResponse.json({ ok: true })
  }

  // ── toggle_activo ─────────────────────────────────────────────────────────
  if (action === 'toggle_activo') {
    const { data: c } = await db.from('clinicas').select('activo').eq('id', clinica_id).single()
    const nuevoActivo = !c?.activo
    await db.from('clinicas').update({ activo: nuevoActivo }).eq('id', clinica_id)
    if (!nuevoActivo) {
      await db.from('subscriptions').update({ estado: 'pausada' }).eq('clinica_id', clinica_id)
    } else {
      const { data: sub } = await db.from('subscriptions').select('estado').eq('clinica_id', clinica_id).single()
      if (sub?.estado === 'pausada') {
        await db.from('subscriptions').update({ estado: 'trial' }).eq('clinica_id', clinica_id)
      }
    }
    await log(db, clinica_id, user.email!, 'toggle_activo', 'activo', String(c?.activo), String(nuevoActivo))
    return NextResponse.json({ ok: true })
  }

  // ── toggle_feature ────────────────────────────────────────────────────────
  if (action === 'toggle_feature') {
    if (!feature_key) return NextResponse.json({ error: 'feature_key requerido' }, { status: 400 })
    const { data: clinica } = await db.from('clinicas').select('configuracion').eq('id', clinica_id).single()
    const cfg = (clinica?.configuracion ?? {}) as Record<string, unknown>
    const features = (cfg.features ?? {}) as Record<string, boolean>
    const enabled = value === 'true'
    await db.from('clinicas').update({
      configuracion: { ...cfg, features: { ...features, [feature_key]: enabled } },
    }).eq('id', clinica_id)
    await log(db, clinica_id, user.email!, 'toggle_feature', feature_key, String(features[feature_key] ?? null), String(enabled))
    return NextResponse.json({ ok: true })
  }

  // ── set_limit_override ────────────────────────────────────────────────────
  if (action === 'set_limit_override') {
    if (!limit_key) return NextResponse.json({ error: 'limit_key requerido' }, { status: 400 })
    const validKeys: (keyof PlanLimits)[] = ['profesionales', 'pacientes', 'conversaciones_ia', 'usuarios', 'storage_gb']
    if (!validKeys.includes(limit_key)) return NextResponse.json({ error: 'limit_key inválido' }, { status: 400 })

    const { data: sub } = await db.from('subscriptions').select('limit_overrides').eq('clinica_id', clinica_id).single()
    const prevOverrides = (sub?.limit_overrides ?? {}) as Record<string, number>
    const prevVal = prevOverrides[limit_key]

    let newOverrides: Record<string, number | null>
    if (value === null || value === '' || value === 'reset') {
      // Remove override → revert to plan default
      newOverrides = { ...prevOverrides }
      delete newOverrides[limit_key]
    } else {
      const parsed = parseInt(value ?? '')
      if (isNaN(parsed)) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
      newOverrides = { ...prevOverrides, [limit_key]: parsed }
    }

    await db.from('subscriptions').update({
      limit_overrides: Object.keys(newOverrides).length > 0 ? newOverrides : null,
    }).eq('clinica_id', clinica_id)
    await log(db, clinica_id, user.email!, 'set_limit_override', limit_key, String(prevVal ?? 'default'), value ?? 'reset')
    return NextResponse.json({ ok: true })
  }

  // ── set_nota ──────────────────────────────────────────────────────────────
  if (action === 'set_nota') {
    await db.from('clinicas').update({ notas_superadmin: value ?? null }).eq('id', clinica_id)
    await log(db, clinica_id, user.email!, 'set_nota', 'notas_superadmin', null, value ?? null)
    return NextResponse.json({ ok: true })
  }

  // ── impersonate ───────────────────────────────────────────────────────────
  if (action === 'impersonate') {
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'
    const { data: link, error: linkErr } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
      options: { redirectTo: `${appUrl}/dashboard` },
    })
    if (linkErr || !link) return NextResponse.json({ error: 'Error generando link' }, { status: 500 })

    await log(db, clinica_id, user.email!, 'impersonate', undefined, undefined, authUser.user.email)
    return NextResponse.json({ link: link.properties?.action_link ?? null })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
