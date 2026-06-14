import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_PRICES, type Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !SUPERADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : new Date()
  const diasDefault = parseInt(searchParams.get('dias') ?? '30')
  const desde = searchParams.get('desde')
    ? new Date(searchParams.get('desde')!)
    : new Date(hasta.getTime() - diasDefault * 86400_000)

  const db = createAdminClient()

  const [{ data: clinicas }, { data: subscriptions }, { data: citasPeriodo }] = await Promise.all([
    db.from('clinicas').select('id, created_at'),
    db.from('subscriptions').select('clinica_id, plan, estado'),
    db.from('citas').select('clinica_id, created_at').gte('created_at', desde.toISOString()).lte('created_at', hasta.toISOString()),
  ])

  const nuevas_clinicas = (clinicas ?? []).filter(c =>
    new Date(c.created_at) >= desde && new Date(c.created_at) <= hasta
  ).length

  const por_plan: Record<string, number> = { free: 0, pro: 0, clinica: 0 }
  const por_estado: Record<string, number> = { trial: 0, activa: 0, pausada: 0, cancelada: 0 }
  let mrr_real = 0

  for (const s of subscriptions ?? []) {
    const estado = s.estado ?? 'trial'
    if (por_estado[estado] !== undefined) por_estado[estado]++
    if (estado === 'activa') {
      const plan = (s.plan ?? 'free') as Plan
      if (por_plan[plan] !== undefined) por_plan[plan]++
      mrr_real += PLAN_PRICES[plan] ?? 0
    }
  }

  // Weekly breakdown
  const semanas: { semana: string; clinicas: number; citas: number }[] = []
  const diffDays = Math.ceil((hasta.getTime() - desde.getTime()) / 86400_000)
  const weeks = Math.ceil(diffDays / 7)
  for (let i = 0; i < weeks; i++) {
    const wStart = new Date(desde.getTime() + i * 7 * 86400_000)
    const wEnd = new Date(Math.min(wStart.getTime() + 7 * 86400_000, hasta.getTime()))
    const label = wStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
    const wClinicas = (clinicas ?? []).filter(c => {
      const d = new Date(c.created_at)
      return d >= wStart && d < wEnd
    }).length
    const wCitas = (citasPeriodo ?? []).filter(c => {
      const d = new Date(c.created_at)
      return d >= wStart && d < wEnd
    }).length
    semanas.push({ semana: label, clinicas: wClinicas, citas: wCitas })
  }

  return NextResponse.json({
    nuevas_clinicas,
    citas_periodo: (citasPeriodo ?? []).length,
    mrr_real,
    por_plan,
    por_estado,
    crecimiento_semanal: semanas,
  })
}
