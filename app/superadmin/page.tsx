'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Building2, Users, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp,
  CreditCard, BarChart3, Search, LogOut, Shield, Zap, ExternalLink,
  DollarSign, Activity,
} from 'lucide-react'
import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/lib/subscriptions/queries'

// ─── Types ────────────────────────────────────────────────────

type Limites = { profesionales: number; pacientes: number; conversaciones_ia: number }
type Uso = { profesionales: number; pacientes: number; citas_mes: number; citas_total: number }

type ClinicaRow = {
  id: string
  nombre: string
  email: string | null
  created_at: string
  activo: boolean
  owner_id: string | null
  configuracion: { features?: Record<string, boolean> } | null
  uso: Uso
  limites: Limites
  subscription: {
    plan: Plan
    estado: 'activa' | 'trial' | 'pausada' | 'cancelada'
    trial_ends_at: string | null
    current_period_end: string | null
    flow_subscription_id: string | null
    card_last4: string | null
    card_type: string | null
    anual: boolean | null
    updated_at: string
  } | null
}

type Metricas = {
  nuevas_clinicas: number
  citas_periodo: number
  mrr_real: number
  por_plan: Record<string, number>
  por_estado: Record<string, number>
  crecimiento_semanal: { semana: string; clinicas: number; citas: number }[]
}

// ─── Config ───────────────────────────────────────────────────

const ESTADO_CFG = {
  activa:    { label: 'Activa',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  trial:     { label: 'Trial',     bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  pausada:   { label: 'Pausada',   bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400'   },
  cancelada: { label: 'Cancelada', bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-300'  },
} as const

const FEATURES = [
  { key: 'whatsapp_habilitado',      label: 'WhatsApp / Agente IA',      desc: 'Acceso a inbox y agente IA' },
  { key: 'wizard_habilitado',        label: 'Wizard de atención',         desc: 'Wizard paso a paso al iniciar cita' },
  { key: 'consentimiento_habilitado',label: 'Consentimiento informado',   desc: 'Envío y firma digital' },
  { key: 'reportes_habilitado',      label: 'Reportes financieros',       desc: 'Dashboard de ingresos y estadísticas' },
]

const DIAS_RANGO = [
  { label: '7d',   dias: 7 },
  { label: '30d',  dias: 30 },
  { label: '90d',  dias: 90 },
  { label: '1 año', dias: 365 },
]

// ─── Component ────────────────────────────────────────────────

export default function SuperAdminPage() {
  const router = useRouter()
  const [clinicas, setClinicas] = useState<ClinicaRow[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [metricasLoading, setMetricasLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('todos')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [actioning, setActioning] = useState<string | null>(null)
  const [diasRango, setDiasRango] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/superadmin/clinicas')
      if (res.status === 403) { setError('No autorizado'); return }
      const data = await res.json()
      setClinicas(data.clinicas ?? [])
    } catch {
      setError('Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMetricas = useCallback(async (dias: number) => {
    setMetricasLoading(true)
    try {
      const res = await fetch(`/api/superadmin/metricas?dias=${dias}`)
      const data = await res.json()
      setMetricas(data)
    } catch { /* silencioso */ } finally {
      setMetricasLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadMetricas(diasRango) }, [loadMetricas, diasRango])

  async function action(clinica_id: string, actionType: string, value?: string, feature_key?: string) {
    const key = clinica_id + actionType + (value ?? '') + (feature_key ?? '')
    setActioning(key)
    try {
      await fetch('/api/superadmin/clinicas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id, action: actionType, value, feature_key }),
      })
      await load()
    } finally {
      setActioning(null)
    }
  }

  async function impersonate(clinica_id: string) {
    setActioning(clinica_id + 'impersonate')
    try {
      const res = await fetch('/api/superadmin/clinicas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id, action: 'impersonate' }),
      })
      const data = await res.json()
      if (data.link) window.open(data.link, '_blank')
      else alert('No se pudo generar el link de impersonación')
    } finally {
      setActioning(null)
    }
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/superadmin/login')
  }

  const filtered = clinicas.filter(c => {
    const matchSearch = !search
      || c.nombre.toLowerCase().includes(search.toLowerCase())
      || (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'todos' || (c.subscription?.estado ?? 'trial') === filterEstado
    return matchSearch && matchEstado
  })

  // Summary metrics from clinic list
  const total = clinicas.length
  const activas = clinicas.filter(c => c.subscription?.estado === 'activa').length
  const trials = clinicas.filter(c => c.subscription?.estado === 'trial').length
  const pausadas = clinicas.filter(c => c.subscription?.estado === 'pausada').length
  const trialsVenciendo = clinicas.filter(c => {
    if (c.subscription?.estado !== 'trial' || !c.subscription.trial_ends_at) return false
    const diff = (new Date(c.subscription.trial_ends_at).getTime() - Date.now()) / 86400000
    return diff >= 0 && diff <= 3
  }).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="size-6 animate-spin text-gray-400" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <XCircle className="size-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium">{error}</p>
        <button onClick={() => router.push('/superadmin/login')} className="mt-3 text-sm text-blue-600 underline">
          Ir al login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0B132B] border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="size-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">SimpliClinic — Super Admin</h1>
              <p className="text-[10px] text-white/40">{total} clínicas · {format(new Date(), "d MMM yyyy", { locale: es })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <RefreshCw className="size-4" />
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs">
              <LogOut className="size-3.5" />
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Metrics cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={<Building2 className="size-4" />} label="Total" value={total} color="blue" />
          <MetricCard icon={<CheckCircle2 className="size-4" />} label="Activas" value={activas} color="green" />
          <MetricCard icon={<Clock className="size-4" />} label="Trial" value={trials} color="amber" />
          <MetricCard icon={<AlertTriangle className="size-4" />} label="Pausadas" value={pausadas} color="red" />
          <MetricCard icon={<TrendingUp className="size-4" />} label="Trial vence ≤3d" value={trialsVenciendo} color={trialsVenciendo > 0 ? 'red' : 'gray'} />
          <MetricCard
            icon={<DollarSign className="size-4" />}
            label="MRR real"
            value={metricas ? `$${Math.round(metricas.mrr_real / 1000)}K` : '—'}
            color="purple"
          />
        </div>

        {/* Period metrics */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800">Actividad del período</h2>
            </div>
            <div className="flex gap-1.5">
              {DIAS_RANGO.map(r => (
                <button
                  key={r.dias}
                  onClick={() => setDiasRango(r.dias)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    diasRango === r.dias ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {metricasLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-gray-300" /></div>
          ) : metricas?.nuevas_clinicas !== undefined ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniMetric label="Nuevas clínicas" value={metricas.nuevas_clinicas ?? 0} />
                <MiniMetric label="Citas en período" value={metricas.citas_periodo ?? 0} />
                <MiniMetric label="MRR" value={`$${Math.round((metricas.mrr_real ?? 0) / 1000)}K`} />
                <MiniMetric label="Distrib. planes" value={metricas.por_plan ? `${metricas.por_plan.free ?? 0}F / ${metricas.por_plan.pro ?? 0}P / ${metricas.por_plan.clinica ?? 0}C` : '—'} />
              </div>

              {/* Weekly breakdown table */}
              {(metricas.crecimiento_semanal ?? []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 text-gray-400 font-medium">Semana</th>
                        <th className="text-right py-2 text-gray-400 font-medium">Nuevas clínicas</th>
                        <th className="text-right py-2 text-gray-400 font-medium">Citas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(metricas.crecimiento_semanal ?? []).map((s, i) => (
                        <tr key={i}>
                          <td className="py-2 text-gray-600">{s.semana}</td>
                          <td className="py-2 text-right text-gray-800 font-medium">{s.clinicas}</td>
                          <td className="py-2 text-right text-gray-800 font-medium">{s.citas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Plan comparison table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Comparación de planes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium w-48">Funcionalidad</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Trial</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Simpli</th>
                  <th className="text-center px-4 py-3 text-blue-600 font-semibold">Simpli+</th>
                  <th className="text-center px-4 py-3 text-purple-600 font-semibold">Simpli Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <PlanRow label="Precio" trial="Gratis 7 días" free="$29.900/mes" pro="$59.900/mes" clinica="$99.900/mes" icon={false} />
                <PlanRow label="Profesionales" trial="Ilimitado" free="1" pro="5" clinica="Ilimitado" icon={false} />
                <PlanRow label="Pacientes" trial="5.000" free="200" pro="1.000" clinica="5.000" icon={false} />
                <PlanRow label="Agenda (día/semana/mes)" trial="✓" free="Solo día" pro="✓" clinica="✓" />
                <PlanRow label="Booking público" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Google Calendar" trial="✓" free="✓" pro="✓" clinica="✓" />
                <PlanRow label="Recordatorios email" trial="✓" free="✓" pro="✓" clinica="✓" />
                <PlanRow label="WhatsApp recordatorios" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Agente IA WhatsApp" trial="✓" free="✗" pro="300/mes" clinica="1.000/mes" />
                <PlanRow label="Inbox WhatsApp" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Consentimiento informado" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Wizard de atención" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Notas clínicas" trial="✓" free="✓" pro="✓" clinica="✓" />
                <PlanRow label="Ficha de pacientes" trial="✓" free="✓" pro="✓" clinica="✓" />
                <PlanRow label="Reportes financieros" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Invitación de equipo" trial="✓" free="✗" pro="✓" clinica="✓" />
                <PlanRow label="Galería de fotos" trial="✓" free="✓" pro="✓" clinica="✓" />
              </tbody>
            </table>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar clínica o email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['todos', 'activa', 'trial', 'pausada', 'cancelada'].map(e => (
              <button
                key={e}
                onClick={() => setFilterEstado(e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filterEstado === e ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-200'
                }`}
              >
                {e === 'todos' ? 'Todos' : ESTADO_CFG[e as keyof typeof ESTADO_CFG]?.label ?? e}
              </button>
            ))}
          </div>
        </div>

        {/* Clinic list */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Sin resultados</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(c => {
                const sub = c.subscription
                const estado = sub?.estado ?? 'trial'
                const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.trial
                const isExpanded = expanded === c.id
                const tab = activeTab[c.id] ?? 'resumen'
                const trialVence = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
                const trialVencido = trialVence ? isPast(trialVence) : false

                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <span className="text-white text-[11px] font-bold">{c.nombre.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                            {!c.activo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium shrink-0">Inactiva</span>}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{c.email ?? '—'}</p>
                        </div>
                        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                          {estado === 'trial' && trialVence && !trialVencido && (
                            <span className="opacity-70">· {Math.ceil((trialVence.getTime() - Date.now()) / 86400000)}d</span>
                          )}
                        </div>
                        <span className="hidden md:block text-xs text-gray-500 shrink-0 w-20 text-right">{sub ? PLAN_LABELS[sub.plan] : '—'}</span>
                        <span className="hidden lg:block text-xs text-gray-400 shrink-0 w-20 text-right">{c.uso.citas_total} citas</span>
                        <span className="hidden lg:block text-xs text-gray-400 shrink-0 w-24 text-right">{safeFormat(c.created_at, 'd MMM yy')}</span>
                        {isExpanded ? <ChevronUp className="size-4 text-gray-300 shrink-0" /> : <ChevronDown className="size-4 text-gray-300 shrink-0" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50">
                        {/* Tabs */}
                        <div className="flex gap-1 px-5 pt-3">
                          {['resumen', 'features', 'acceso'].map(t => (
                            <button
                              key={t}
                              onClick={() => setActiveTab(prev => ({ ...prev, [c.id]: t }))}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                                tab === t ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {t === 'resumen' ? 'Resumen' : t === 'features' ? 'Feature flags' : 'Acceso'}
                            </button>
                          ))}
                        </div>

                        <div className="p-5">
                          {tab === 'resumen' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              {/* Info + uso */}
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Detalle</p>
                                  <InfoRow label="ID" value={<span className="font-mono text-[10px] break-all">{c.id}</span>} />
                                  <InfoRow label="Email" value={c.email ?? '—'} />
                                  <InfoRow label="Registrada" value={safeFormat(c.created_at, "d 'de' MMMM yyyy")} />
                                  <InfoRow label="Plan" value={sub ? PLAN_LABELS[sub.plan] : '—'} />
                                  <InfoRow label="Estado" value={<span className={cfg.text}>{cfg.label}</span>} />
                                  {sub?.trial_ends_at && (
                                    <InfoRow label="Trial vence" value={
                                      <span className={trialVencido ? 'text-red-500' : ''}>
                                        {trialVencido ? 'Vencido · ' : ''}{safeFormat(sub.trial_ends_at, 'd MMM yyyy HH:mm')}
                                      </span>
                                    } />
                                  )}
                                  {sub?.card_last4 && (
                                    <InfoRow label="Tarjeta" value={
                                      <span className="flex items-center gap-1">
                                        <CreditCard className="size-3" />•••• {sub.card_last4} ({sub.card_type})
                                      </span>
                                    } />
                                  )}
                                  {sub?.flow_subscription_id && (
                                    <InfoRow label="Flow ID" value={<span className="font-mono text-[10px]">{sub.flow_subscription_id}</span>} />
                                  )}
                                </div>

                                {/* Uso vs límites */}
                                <div className="space-y-2">
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Uso vs límites</p>
                                  <UsageBar label="Profesionales" used={c.uso?.profesionales ?? 0} max={c.limites?.profesionales ?? 1} />
                                  <UsageBar label="Pacientes" used={c.uso?.pacientes ?? 0} max={c.limites?.pacientes ?? 200} />
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Citas este mes</span>
                                    <span className="font-medium text-gray-800">{c.uso?.citas_mes ?? 0}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Citas total</span>
                                    <span className="font-medium text-gray-800">{c.uso?.citas_total ?? 0}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Cambiar plan</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {(['free', 'pro', 'clinica'] as Plan[]).map(p => (
                                      <ActionBtn
                                        key={p}
                                        active={sub?.plan === p && sub?.estado === 'activa'}
                                        loading={actioning === c.id + 'set_plan' + p}
                                        onClick={() => action(c.id, 'set_plan', p)}
                                      >
                                        {PLAN_LABELS[p]}
                                      </ActionBtn>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-gray-400 mt-1">Activa el plan inmediatamente sin cobrar</p>
                                </div>

                                <div>
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Extender trial</p>
                                  <div className="flex gap-2">
                                    {['7', '14', '30'].map(d => (
                                      <ActionBtn
                                        key={d}
                                        loading={actioning === c.id + 'extend_trial' + d}
                                        onClick={() => action(c.id, 'extend_trial', d)}
                                        variant="amber"
                                      >
                                        +{d}d
                                      </ActionBtn>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Cuenta</p>
                                  <div className="flex gap-2 flex-wrap">
                                    <ActionBtn
                                      loading={actioning === c.id + 'toggle_activo'}
                                      onClick={() => {
                                        if (c.activo && !confirm(`¿Desactivar "${c.nombre}"? Bloqueará el acceso y pausará la suscripción.`)) return
                                        action(c.id, 'toggle_activo')
                                      }}
                                      variant={c.activo ? 'danger' : 'success'}
                                    >
                                      {c.activo ? 'Desactivar' : 'Reactivar'}
                                    </ActionBtn>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Precios del plan</p>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    {(['free', 'pro', 'clinica'] as Plan[]).map(p => (
                                      <div key={p} className="flex justify-between">
                                        <span>{PLAN_LABELS[p]}</span>
                                        <span className="font-medium">${PLAN_PRICES[p].toLocaleString('es-CL')}/mes</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {tab === 'features' && (
                            <div className="space-y-3 max-w-lg">
                              <p className="text-xs text-gray-500">
                                Los feature flags <strong>sobreescriben</strong> los límites del plan. Útil para habilitar funciones específicas a una clínica independientemente de su plan.
                              </p>
                              {FEATURES.map(f => {
                                const enabled = c.configuracion?.features?.[f.key] ?? null
                                const isLoading = actioning === c.id + 'toggle_feature' + f.key
                                return (
                                  <div key={f.key} className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-gray-100">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-800">{f.label}</p>
                                        {enabled !== null && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">OVERRIDE</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-400">{f.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {enabled !== null && (
                                        <button
                                          onClick={() => action(c.id, 'toggle_feature', 'null', f.key)}
                                          className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                                        >
                                          Reset
                                        </button>
                                      )}
                                      <button
                                        disabled={isLoading}
                                        onClick={() => action(c.id, 'toggle_feature', enabled === true ? 'false' : 'true', f.key)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${
                                          enabled === true ? 'bg-blue-600' : 'bg-gray-200'
                                        } disabled:opacity-50`}
                                      >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled === true ? 'translate-x-5' : ''}`} />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {tab === 'acceso' && (
                            <div className="space-y-4 max-w-md">
                              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                                <p className="text-xs text-amber-700 leading-relaxed">
                                  <strong>Impersonar</strong> genera un magic link para el admin de esta clínica. Al abrirlo inicias sesión como ese usuario. Úsalo solo para soporte.
                                </p>
                              </div>
                              <button
                                disabled={actioning === c.id + 'impersonate'}
                                onClick={() => impersonate(c.id)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {actioning === c.id + 'impersonate' ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                                Impersonar admin
                              </button>
                              <div className="text-xs text-gray-400 space-y-1">
                                <p><strong>Owner ID:</strong> <span className="font-mono">{c.owner_id ?? '—'}</span></p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600', gray: 'bg-gray-50 text-gray-400',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${colors[color] ?? colors.gray}`}>{icon}</div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function PlanRow({ label, trial, free, pro, clinica, icon = true }: {
  label: string; trial: string; free: string; pro: string; clinica: string; icon?: boolean
}) {
  function cell(val: string, highlight?: string) {
    const isCheck = val === '✓'
    const isCross = val === '✗'
    return (
      <td className={`text-center px-4 py-2.5 ${highlight ?? ''}`}>
        {isCheck ? <span className="text-green-500 font-bold">✓</span>
         : isCross ? <span className="text-gray-300">✗</span>
         : <span className={isCross ? 'text-gray-300' : 'text-gray-700 font-medium'}>{val}</span>}
      </td>
    )
  }
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-5 py-2.5 text-gray-600">{label}</td>
      {cell(trial)}
      {cell(free)}
      {cell(pro, 'bg-blue-50/30')}
      {cell(clinica, 'bg-purple-50/30')}
    </tr>
  )
}

function safeFormat(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return format(d, fmt, { locale: es })
  } catch { return '—' }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700 text-right">{value}</span>
    </div>
  )
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = !max || max <= 0 ? 0 : Math.min(((used ?? 0) / max) * 100, 100)
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-400' : 'bg-blue-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{used} / {max < 0 ? '∞' : max}</span>
      </div>
      {max > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

function ActionBtn({ children, active, loading, onClick, variant = 'default' }: {
  children: React.ReactNode
  active?: boolean
  loading?: boolean
  onClick: () => void
  variant?: 'default' | 'amber' | 'danger' | 'success'
}) {
  const variants = {
    default: active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300',
    amber:   'bg-white text-amber-600 border-amber-200 hover:bg-amber-50',
    danger:  'bg-white text-red-600 border-red-200 hover:bg-red-50',
    success: 'bg-white text-green-600 border-green-200 hover:bg-green-50',
  }
  return (
    <button
      disabled={loading}
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${variants[variant]}`}
    >
      {loading && <Loader2 className="size-3 animate-spin" />}
      {children}
    </button>
  )
}
