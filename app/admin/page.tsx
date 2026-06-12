import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/subscriptions/queries'
import type { Plan } from '@/lib/subscriptions/queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL')
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminPage() {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (adminEmails.length > 0 && !adminEmails.includes(user.email ?? '')) {
    redirect('/dashboard')
  }

  // Data
  const db = createAdminClient()

  const [{ data: subs }, { data: clinicas }] = await Promise.all([
    db.from('subscriptions').select('*').order('created_at', { ascending: false }),
    db.from('clinicas').select('id, nombre, email, owner_id, created_at'),
  ])

  const clinicaMap = Object.fromEntries((clinicas ?? []).map(c => [c.id, c]))

  // Metrics
  const activeSubs = (subs ?? []).filter(s => s.estado === 'activa')
  const trialSubs  = (subs ?? []).filter(s => s.estado === 'trial')
  const pausedSubs = (subs ?? []).filter(s => s.estado === 'pausada')
  const canceledSubs = (subs ?? []).filter(s => s.estado === 'cancelada')

  const mrr = activeSubs.reduce((acc, s) => acc + (PLAN_PRICES[s.plan as Plan] ?? 0), 0)

  const planCounts: Record<string, number> = {}
  for (const s of activeSubs) {
    planCounts[s.plan] = (planCounts[s.plan] ?? 0) + 1
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SimpliClinic — Admin</h1>
        <p className="text-sm text-gray-400 mb-8">Panel interno. Solo visible para admins.</p>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Kpi label="MRR estimado" value={formatCLP(mrr)} sub="planes activos" />
          <Kpi label="Activas" value={String(activeSubs.length)} sub="suscripciones" color="text-emerald-600" />
          <Kpi label="En trial" value={String(trialSubs.length)} sub="7 días" color="text-amber-600" />
          <Kpi label="Pausadas" value={String(pausedSubs.length)} sub="pago fallido" color="text-orange-500" />
        </div>

        {/* Plan breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
          <h2 className="text-[14px] font-semibold text-gray-700 mb-3">Distribución de planes (activos)</h2>
          <div className="flex flex-wrap gap-4">
            {(['free', 'pro', 'clinica'] as Plan[]).map(plan => (
              <div key={plan} className="flex flex-col items-center bg-gray-50 rounded-lg px-6 py-3 min-w-[100px]">
                <span className="text-2xl font-bold text-gray-900">{planCounts[plan] ?? 0}</span>
                <span className="text-[12px] text-gray-500 mt-0.5">{PLAN_LABELS[plan]}</span>
                <span className="text-[11px] text-gray-400">{formatCLP(PLAN_PRICES[plan])}/mes</span>
              </div>
            ))}
          </div>
        </div>

        {/* All subscriptions table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-700">
              Todas las clínicas ({(subs ?? []).length})
            </h2>
            <div className="flex gap-2 text-[11px] text-gray-400">
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{activeSubs.length} activas</span>
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{trialSubs.length} trial</span>
              <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded-full">{canceledSubs.length} canceladas</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-left">
                  <th className="px-4 py-2 font-medium">Clínica</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Trial vence</th>
                  <th className="px-4 py-2 font-medium">Período actual</th>
                  <th className="px-4 py-2 font-medium">Conv IA (mes)</th>
                  <th className="px-4 py-2 font-medium">Creada</th>
                </tr>
              </thead>
              <tbody>
                {(subs ?? []).map(sub => {
                  const clinica = clinicaMap[sub.clinica_id]
                  const estadoColor =
                    sub.estado === 'activa'    ? 'bg-emerald-50 text-emerald-700' :
                    sub.estado === 'trial'     ? 'bg-amber-50 text-amber-700' :
                    sub.estado === 'pausada'   ? 'bg-orange-50 text-orange-600' :
                    'bg-red-50 text-red-500'

                  return (
                    <tr key={sub.clinica_id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{clinica?.nombre ?? sub.clinica_id.slice(0, 8)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{clinica?.email ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-700">{PLAN_LABELS[sub.plan as Plan] ?? sub.plan}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${estadoColor}`}>
                          {sub.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{fmt(sub.trial_ends_at)}</td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {sub.current_period_end ? `hasta ${fmt(sub.current_period_end)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {sub.conv_ia_usadas != null ? `${sub.conv_ia_usadas} / ${sub.conv_ia_mes ?? '—'}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{fmt(sub.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className={`text-[24px] font-bold ${color} leading-tight`}>{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  )
}
