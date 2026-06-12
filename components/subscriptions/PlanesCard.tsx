'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2, Zap, Building2, Star } from 'lucide-react'
import {
  getSubscription,
  PLAN_LIMITS,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_PRICES_ANUAL,
  type Subscription,
  type Plan,
} from '@/lib/subscriptions/queries'
import { getClinicaId } from '@/lib/onboarding/queries'
import { clearSubscripcionCache } from '@/lib/subscriptions/useSubscripcion'

// ─── Plan feature lists ────────────────────────────────────────────────────────

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    '1 profesional',
    'Hasta 200 pacientes',
    'Agenda completa',
    'Fichas clínicas',
    'Booking público',
    'Recordatorios por email',
    'Soporte por email',
  ],
  pro: [
    'Hasta 5 profesionales',
    'Hasta 1.000 pacientes',
    'Todo lo del plan Solo',
    'Agente IA WhatsApp (300 conv/mes)',
    'Recordatorios automáticos',
    'Reportes avanzados',
    'Roles de usuario',
    'Soporte prioritario',
  ],
  clinica: [
    'Profesionales ilimitados',
    'Hasta 5.000 pacientes',
    'Todo lo del plan Clínica',
    'Agente IA WhatsApp (1.000 conv/mes)',
    'Onboarding dedicado',
    'SLA prioritario',
  ],
}

const PLAN_ICONS: Record<Plan, React.ElementType> = {
  free:    Star,
  pro:     Zap,
  clinica: Building2,
}

function formatCLP(n: number): string {
  if (n === 0) return '$0'
  return '$' + n.toLocaleString('es-CL')
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  subscription,
  clinicaId,
  onUpgrade,
  onPortal,
  loading,
  anual,
}: {
  plan: Plan
  subscription: Subscription | null
  clinicaId: string | null
  onUpgrade: (plan: Plan) => void
  onPortal: () => void
  loading: string | null
  anual: boolean
}) {
  const isCurrent = subscription?.plan === plan
  const isPaid    = plan !== 'free'
  const hasStripe = !!subscription?.stripe_customer_id
  const Icon      = PLAN_ICONS[plan]
  const priceMes  = PLAN_PRICES[plan]
  const priceAnual = PLAN_PRICES_ANUAL[plan]
  const price     = anual && isPaid ? Math.round(priceAnual / 12) : priceMes
  const limits    = PLAN_LIMITS[plan]
  const features  = PLAN_FEATURES[plan]

  const isHighlighted = plan === 'pro'
  const isLoadingThis = loading === plan || (loading === 'portal' && isCurrent)

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
        isCurrent
          ? 'border-[#2563EB] bg-gradient-to-br from-blue-50 to-white shadow-md shadow-blue-100'
          : isHighlighted
          ? 'border-blue-200 bg-white shadow-sm'
          : 'border-gray-100 bg-white'
      }`}
    >
      {isCurrent && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px] font-semibold bg-[#2563EB] text-white px-3 py-0.5 rounded-full whitespace-nowrap">
          Plan actual
        </span>
      )}
      {isHighlighted && !isCurrent && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px] font-semibold bg-[#0B132B] text-white px-3 py-0.5 rounded-full whitespace-nowrap">
          Más popular
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isCurrent ? 'bg-[#2563EB] text-white' : 'bg-blue-50 text-[#2563EB]'
        }`}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{PLAN_LABELS[plan]}</p>
          <p className="text-[11px] text-gray-400">
            {limits.profesionales === -1 ? 'Profesionales ilimitados' : `${limits.profesionales} profesional${limits.profesionales !== 1 ? 'es' : ''}`}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-1">
        <span className="text-[28px] font-extrabold text-gray-900 leading-tight">{formatCLP(price)}</span>
        {price > 0 && <span className="text-[12px] text-gray-400 ml-1">CLP/mes</span>}
      </div>
      {anual && isPaid && (
        <p className="text-[11px] text-emerald-600 font-medium mb-4">
          {formatCLP(priceAnual)}/año — 2 meses gratis
        </p>
      )}
      {!anual && isPaid && <div className="mb-4" />}

      {/* Features */}
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-[12px] text-gray-600">
            <Check className={`size-3.5 mt-0.5 shrink-0 ${isCurrent ? 'text-[#2563EB]' : 'text-[#10B981]'}`} />
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        hasStripe ? (
          <button
            disabled={isLoadingThis}
            onClick={onPortal}
            className="w-full h-9 rounded-xl border border-[#2563EB] text-[#2563EB] text-[13px] font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isLoadingThis ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Gestionar suscripción
          </button>
        ) : (
          <div className="w-full h-9 rounded-xl bg-blue-50 text-[#2563EB] text-[13px] font-medium flex items-center justify-center">
            Plan actual
          </div>
        )
      ) : isPaid ? (
        <button
          disabled={isLoadingThis || !clinicaId}
          onClick={() => onUpgrade(plan)}
          className="w-full h-9 rounded-xl text-[13px] font-medium text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          {isLoadingThis ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Actualizar a {PLAN_LABELS[plan]}
        </button>
      ) : (
        <div className="w-full h-9 rounded-xl bg-gray-50 text-gray-400 text-[13px] font-medium flex items-center justify-center">
          Plan gratuito
        </div>
      )}
    </div>
  )
}

// ─── PlanesCard ───────────────────────────────────────────────────────────────

export default function PlanesCard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [clinicaId, setClinicaId]       = useState<string | null>(null)
  const [cargando, setCargando]         = useState(true)
  const [loading, setLoading]           = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [anual, setAnual]               = useState(false)
  const [syncing, setSyncing]           = useState(false)
  const searchParams                    = useSearchParams()
  const syncedRef                       = useRef(false)

  useEffect(() => {
    Promise.all([getSubscription(), getClinicaId()]).then(([sub, id]) => {
      setSubscription(sub)
      setClinicaId(id)
      setCargando(false)

      // After checkout success, sync subscription directly from Stripe
      if (searchParams.get('checkout') === 'success' && id && !syncedRef.current) {
        syncedRef.current = true
        setSyncing(true)
        fetch('/api/stripe/sync-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinica_id: id }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.synced) {
              clearSubscripcionCache()
              getSubscription().then(updated => {
                setSubscription(updated)
                // Clear the URL param
                window.history.replaceState({}, '', '/configuracion?tab=plan')
              })
            }
          })
          .catch(console.error)
          .finally(() => setSyncing(false))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpgrade(plan: Plan) {
    if (!clinicaId) return
    setLoading(plan)
    setError(null)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clinica_id: clinicaId, plan, anual }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear sesión de pago')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(null)
    }
  }

  async function handlePortal() {
    if (!clinicaId) return
    setLoading('portal')
    setError(null)
    try {
      const res  = await fetch('/api/stripe/portal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clinica_id: clinicaId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al abrir portal')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(null)
    }
  }

  if (cargando || syncing) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400">
        <Loader2 className="size-4 animate-spin" />
        {syncing ? 'Confirmando pago…' : 'Cargando plan…'}
      </div>
    )
  }

  const plans: Plan[] = ['free', 'pro', 'clinica']

  return (
    <div>
      {/* Estado actual */}
      {subscription && (
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-medium bg-[#2563EB] text-white px-2.5 py-0.5 rounded-full">
            Plan {PLAN_LABELS[subscription.plan]}
          </span>
          <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${
            subscription.estado === 'activa'  ? 'bg-emerald-50 text-[#10B981]' :
            subscription.estado === 'trial'   ? 'bg-amber-50 text-amber-600' :
            subscription.estado === 'pausada' ? 'bg-orange-50 text-orange-600' :
            'bg-red-50 text-red-500'
          }`}>
            {subscription.estado === 'activa'    ? 'Activa' :
             subscription.estado === 'trial'     ? 'Período de prueba' :
             subscription.estado === 'pausada'   ? 'Pausada' :
             'Cancelada'}
          </span>
          {subscription.trial_ends_at && subscription.estado === 'trial' && (
            <span className="text-[11px] text-gray-400">
              Vence {new Date(subscription.trial_ends_at).toLocaleDateString('es-CL')}
            </span>
          )}
          {subscription.current_period_end && subscription.estado === 'activa' && (
            <span className="text-[11px] text-gray-400">
              Próximo cobro: {new Date(subscription.current_period_end).toLocaleDateString('es-CL')}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* Toggle mensual / anual */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-[13px] font-medium ${!anual ? 'text-gray-900' : 'text-gray-400'}`}>Mensual</span>
        <button
          onClick={() => setAnual(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${anual ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${anual ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-[13px] font-medium ${anual ? 'text-gray-900' : 'text-gray-400'}`}>
          Anual
          <span className="ml-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">−20%</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            subscription={subscription}
            clinicaId={clinicaId}
            onUpgrade={handleUpgrade}
            onPortal={handlePortal}
            loading={loading}
            anual={anual}
          />
        ))}
      </div>

      {/* ROI pitch */}
      <div className="mt-5 p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
        <p className="text-[12px] text-[#2563EB] font-medium">
          💡 Una sola hora recuperada por recordatorios automáticos ya paga el plan mensual completo.
        </p>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Precios en pesos chilenos (CLP). Puedes cancelar en cualquier momento.
      </p>
    </div>
  )
}
