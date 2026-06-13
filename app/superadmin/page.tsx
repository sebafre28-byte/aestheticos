'use client'

import { useEffect, useState } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Building2, Users, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp,
  CreditCard, BarChart3, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLAN_LABELS, PLAN_PRICES, type Plan } from '@/lib/subscriptions/queries'

type ClinicaRow = {
  id: string
  nombre: string
  email: string | null
  created_at: string
  activo: boolean
  owner_id: string | null
  total_citas: number
  subscription: {
    plan: Plan
    estado: 'activa' | 'trial' | 'pausada' | 'cancelada'
    trial_ends_at: string | null
    current_period_end: string | null
    flow_subscription_id: string | null
    card_last4: string | null
    updated_at: string
  } | null
}

const ESTADO_CONFIG = {
  activa:    { label: 'Activa',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  trial:     { label: 'Trial',     bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  pausada:   { label: 'Pausada',   bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400'   },
  cancelada: { label: 'Cancelada', bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-300'  },
}

export default function SuperAdminPage() {
  const [clinicas, setClinicas] = useState<ClinicaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('todos')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  async function load() {
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
  }

  useEffect(() => { load() }, [])

  async function action(clinica_id: string, actionType: string, value?: string) {
    setActioning(clinica_id + actionType)
    await fetch('/api/superadmin/clinicas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinica_id, action: actionType, value }),
    })
    await load()
    setActioning(null)
  }

  const filtered = clinicas.filter(c => {
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'todos' || (c.subscription?.estado ?? 'sin_sub') === filterEstado
    return matchSearch && matchEstado
  })

  // Metrics
  const total = clinicas.length
  const activas = clinicas.filter(c => c.subscription?.estado === 'activa').length
  const trials = clinicas.filter(c => c.subscription?.estado === 'trial').length
  const pausadas = clinicas.filter(c => c.subscription?.estado === 'pausada').length
  const trialsVenciendo = clinicas.filter(c => {
    if (c.subscription?.estado !== 'trial' || !c.subscription.trial_ends_at) return false
    const ends = new Date(c.subscription.trial_ends_at)
    const diff = (ends.getTime() - Date.now()) / 86400000
    return diff >= 0 && diff <= 3
  }).length

  const mrrEstimado = clinicas
    .filter(c => c.subscription?.estado === 'activa')
    .reduce((acc, c) => acc + PLAN_PRICES[c.subscription!.plan ?? 'free'], 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="size-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">SimpliClinic — Super Admin</h1>
            <p className="text-xs text-gray-400">{total} clínicas registradas</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600">
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard icon={<Building2 className="size-4" />} label="Total" value={total} color="blue" />
          <MetricCard icon={<CheckCircle2 className="size-4" />} label="Activas" value={activas} color="green" />
          <MetricCard icon={<Clock className="size-4" />} label="Trial" value={trials} color="amber" />
          <MetricCard icon={<AlertTriangle className="size-4" />} label="Pausadas" value={pausadas} color="red" />
          <MetricCard icon={<TrendingUp className="size-4" />} label="Trial vence pronto" value={trialsVenciendo} color={trialsVenciendo > 0 ? 'red' : 'gray'} />
          <MetricCard icon={<BarChart3 className="size-4" />} label="MRR estimado" value={`$${(mrrEstimado / 1000).toFixed(0)}K`} color="purple" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar clínica o email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                {e === 'todos' ? 'Todos' : ESTADO_CONFIG[e as keyof typeof ESTADO_CONFIG]?.label ?? e}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">Sin resultados</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(c => {
                const sub = c.subscription
                const estado = sub?.estado ?? 'trial'
                const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.trial
                const isExpanded = expanded === c.id
                const trialVence = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
                const trialVencido = trialVence ? isPast(trialVence) : false

                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Logo placeholder */}
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                          <span className="text-white text-[11px] font-bold">{c.nombre.slice(0, 2).toUpperCase()}</span>
                        </div>

                        {/* Name + email */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                            {!c.activo && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium shrink-0">Inactiva</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{c.email ?? '—'}</p>
                        </div>

                        {/* Estado pill */}
                        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                          {estado === 'trial' && trialVence && !trialVencido && (
                            <span className="opacity-70">· {Math.ceil((trialVence.getTime() - Date.now()) / 86400000)}d</span>
                          )}
                        </div>

                        {/* Plan */}
                        <span className="hidden md:block text-xs text-gray-500 shrink-0 w-20 text-right">
                          {sub ? PLAN_LABELS[sub.plan] : '—'}
                        </span>

                        {/* Citas */}
                        <span className="hidden lg:block text-xs text-gray-400 shrink-0 w-16 text-right">
                          {c.total_citas} citas
                        </span>

                        {/* Fecha */}
                        <span className="hidden lg:block text-xs text-gray-400 shrink-0 w-24 text-right">
                          {format(new Date(c.created_at), 'd MMM yy', { locale: es })}
                        </span>

                        {isExpanded
                          ? <ChevronUp className="size-4 text-gray-300 shrink-0" />
                          : <ChevronDown className="size-4 text-gray-300 shrink-0" />
                        }
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100">
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Info */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Detalle</p>
                            <Row label="ID" value={<span className="font-mono text-[11px]">{c.id}</span>} />
                            <Row label="Email" value={c.email ?? '—'} />
                            <Row label="Registrada" value={format(new Date(c.created_at), "d 'de' MMMM yyyy", { locale: es })} />
                            <Row label="Plan" value={sub ? PLAN_LABELS[sub.plan] : '—'} />
                            <Row label="Estado" value={cfg.label} />
                            {sub?.trial_ends_at && (
                              <Row
                                label="Trial vence"
                                value={
                                  <span className={trialVencido ? 'text-red-500' : ''}>
                                    {trialVencido ? 'Vencido · ' : ''}{format(new Date(sub.trial_ends_at), "d MMM yyyy HH:mm", { locale: es })}
                                  </span>
                                }
                              />
                            )}
                            {sub?.flow_subscription_id && (
                              <Row label="Flow sub ID" value={<span className="font-mono text-[11px]">{sub.flow_subscription_id}</span>} />
                            )}
                            {sub?.card_last4 && (
                              <Row label="Tarjeta" value={<span className="flex items-center gap-1"><CreditCard className="size-3" /> •••• {sub.card_last4}</span>} />
                            )}
                            <Row label="Total citas" value={`${c.total_citas} citas registradas`} />
                          </div>

                          {/* Actions */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Acciones</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Cambiar plan</p>
                                <div className="flex gap-2 flex-wrap">
                                  {(['free', 'pro', 'clinica'] as Plan[]).map(p => (
                                    <button
                                      key={p}
                                      disabled={sub?.plan === p && sub?.estado === 'activa' || actioning !== null}
                                      onClick={() => action(c.id, 'set_plan', p)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                        sub?.plan === p && sub?.estado === 'activa'
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                      } disabled:opacity-50`}
                                    >
                                      {actioning === c.id + 'set_plan' && sub?.plan !== p ? <Loader2 className="size-3 animate-spin inline mr-1" /> : null}
                                      {PLAN_LABELS[p]}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Extender trial</p>
                                <div className="flex gap-2">
                                  {['7', '14', '30'].map(d => (
                                    <button
                                      key={d}
                                      disabled={actioning !== null}
                                      onClick={() => action(c.id, 'extend_trial', d)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-amber-300 hover:text-amber-600 disabled:opacity-50 transition-colors"
                                    >
                                      {actioning === c.id + 'extend_trial' ? <Loader2 className="size-3 animate-spin inline mr-1" /> : null}
                                      +{d}d
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Cuenta</p>
                                <button
                                  disabled={actioning !== null}
                                  onClick={() => action(c.id, 'toggle_activo')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                                    c.activo
                                      ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                                      : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                                  }`}
                                >
                                  {c.activo ? 'Desactivar clínica' : 'Reactivar clínica'}
                                </button>
                              </div>
                            </div>
                          </div>
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

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray:   'bg-gray-50 text-gray-400',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${colors[color] ?? colors.gray}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-700 text-right">{value}</span>
    </div>
  )
}
