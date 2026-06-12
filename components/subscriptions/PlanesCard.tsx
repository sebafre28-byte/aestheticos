'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Zap, Building2, Star, CreditCard, ChevronRight } from 'lucide-react'
import CancelacionModal from './CancelacionModal'
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
import { useSearchParams } from 'next/navigation'

// ─── Plan features ────────────────────────────────────────────────────────────

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    '1 profesional',
    'Hasta 200 pacientes',
    'Agenda completa (día/semana/mes)',
    'Fichas clínicas con historial',
    'Booking público online',
    'Recordatorios por email',
    'Soporte por email',
  ],
  pro: [
    'Todo lo de Simpli',
    'Hasta 5 profesionales',
    'Hasta 1.000 pacientes',
    'Agente IA WhatsApp (300 conv/mes)',
    'Recordatorios automáticos WhatsApp',
    'Reportes avanzados de ingresos',
    'Roles de usuario (admin/recepcionista)',
    'Soporte prioritario',
  ],
  clinica: [
    'Todo lo de Simpli+',
    'Profesionales ilimitados',
    'Hasta 5.000 pacientes',
    'Agente IA WhatsApp (1.000 conv/mes)',
    'Onboarding dedicado',
    'SLA prioritario',
    'Multi-sede (próximamente)',
  ],
}

const PLAN_ICONS: Record<Plan, React.ElementType> = {
  free:    Star,
  pro:     Zap,
  clinica: Building2,
}

function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL')
}

// ─── CurrentPlanCard ──────────────────────────────────────────────────────────

function CurrentPlanCard({
  subscription,
  clinicaId,
  onUpdateCard,
  onCancel,
  loading,
}: {
  subscription: Subscription
  clinicaId: string
  onUpdateCard: () => void
  onCancel: () => void
  loading: string | null
}) {
  const plan = subscription.plan
  const Icon = PLAN_ICONS[plan]
  const isLoadingPortal = loading === 'portal'

  return (
    <div className="mb-6 rounded-2xl border border-[#2563EB]/20 bg-gradient-to-br from-blue-50 to-white p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
            <Icon className="size-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">Plan {PLAN_LABELS[plan]}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                subscription.estado === 'activa'  ? 'bg-emerald-100 text-emerald-700' :
                subscription.estado === 'trial'   ? 'bg-amber-100 text-amber-700' :
                subscription.estado === 'pausada' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-600'
              }`}>
                {subscription.estado === 'activa'  ? '● Activa' :
                 subscription.estado === 'trial'   ? '◐ Período de prueba' :
                 subscription.estado === 'pausada' ? '⚠ Pausada' : '✕ Cancelada'}
              </span>
              {subscription.trial_ends_at && subscription.estado === 'trial' && (
                <span className="text-[11px] text-gray-400">
                  Vence {new Date(subscription.trial_ends_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                </span>
              )}
              {subscription.current_period_end && subscription.estado === 'activa' && (
                <span className="text-[11px] text-gray-400">
                  Próximo cobro: {new Date(subscription.current_period_end).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tarjeta registrada */}
        {(subscription as Subscription & { card_last4?: string; card_type?: string }).card_last4 && (
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            <CreditCard className="size-3.5" />
            <span>{(subscription as Subscription & { card_last4?: string; card_type?: string }).card_type} ****{(subscription as Subscription & { card_last4?: string; card_type?: string }).card_last4}</span>
          </div>
        )}
      </div>

      {/* Servicios incluidos */}
      <div className="mt-4 pt-4 border-t border-blue-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Incluido en tu plan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {PLAN_FEATURES[plan].map(f => (
            <div key={f} className="flex items-center gap-1.5 text-[12px] text-gray-600">
              <Check className="size-3 text-[#2563EB] shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      {subscription.flow_customer_id && (
        <div className="mt-4 pt-4 border-t border-blue-100 flex flex-wrap gap-2">
          <button
            disabled={isLoadingPortal}
            onClick={onUpdateCard}
            className="flex items-center gap-1.5 text-[12px] text-[#2563EB] hover:underline disabled:opacity-50"
          >
            {isLoadingPortal ? <Loader2 className="size-3 animate-spin" /> : <CreditCard className="size-3" />}
            Actualizar tarjeta
          </button>
          <span className="text-gray-300">·</span>
          <button
            onClick={onCancel}
            className="text-[12px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Cancelar suscripción
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PlanCard (para upgrade) ──────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  clinicaId,
  onUpgrade,
  loading,
  anual,
}: {
  plan: Plan
  isCurrent: boolean
  clinicaId: string | null
  onUpgrade: (plan: Plan) => void
  loading: string | null
  anual: boolean
}) {
  const isPaid = plan !== 'free'
  const Icon   = PLAN_ICONS[plan]
  const price  = anual && isPaid ? Math.round(PLAN_PRICES_ANUAL[plan] / 12) : PLAN_PRICES[plan]
  const isHighlighted = plan === 'pro'
  const isLoadingThis = loading === plan

  return (
    <div className={`relative flex flex-col rounded-2xl border p-4 transition-all ${
      isCurrent
        ? 'border-[#2563EB] bg-blue-50/50'
        : isHighlighted
        ? 'border-blue-200 bg-white shadow-sm'
        : 'border-gray-100 bg-white'
    }`}>
      {isCurrent && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#2563EB] text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
          Plan actual
        </span>
      )}
      {isHighlighted && !isCurrent && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-gray-900 text-white px-2.5 py-0.5 rounded-full whitespace-nowrap">
          Más popular
        </span>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? 'bg-[#2563EB] text-white' : 'bg-blue-50 text-[#2563EB]'}`}>
          <Icon className="size-3.5" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-gray-900">{PLAN_LABELS[plan]}</p>
          <p className="text-[10px] text-gray-400">
            {PLAN_LIMITS[plan].profesionales === -1 ? 'Profesionales ilimitados' : `${PLAN_LIMITS[plan].profesionales} profesional${PLAN_LIMITS[plan].profesionales !== 1 ? 'es' : ''}`}
          </p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-[18px] font-extrabold text-gray-900">{formatCLP(price)}</span>
          <span className="text-[10px] text-gray-400">/mes</span>
        </div>
      </div>

      <ul className="space-y-1.5 mb-4 flex-1">
        {PLAN_FEATURES[plan].map(f => (
          <li key={f} className="flex items-start gap-1.5 text-[11px] text-gray-600">
            <Check className={`size-3 mt-0.5 shrink-0 ${isCurrent ? 'text-[#2563EB]' : 'text-emerald-500'}`} />
            {f}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="w-full h-8 rounded-xl bg-blue-100 text-[#2563EB] text-[12px] font-semibold flex items-center justify-center">
          Plan actual
        </div>
      ) : (
        <button
          disabled={isLoadingThis || !clinicaId}
          onClick={() => onUpgrade(plan)}
          className="w-full h-8 rounded-xl text-[12px] font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
        >
          {isLoadingThis ? <Loader2 className="size-3 animate-spin" /> : <ChevronRight className="size-3" />}
          {plan === 'free' ? 'Activar plan gratuito' : `Cambiar a ${PLAN_LABELS[plan]}`}
        </button>
      )}
    </div>
  )
}

// ─── PlanesCard ───────────────────────────────────────────────────────────────

export default function PlanesCard() {
  const [subscription, setSubscription]       = useState<Subscription | null>(null)
  const [clinicaId, setClinicaId]             = useState<string | null>(null)
  const [cargando, setCargando]               = useState(true)
  const [loading, setLoading]                 = useState<string | null>(null)
  const [error, setError]                     = useState<string | null>(null)
  const [success, setSuccess]                 = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [anual, setAnual]                     = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    Promise.all([getSubscription(), getClinicaId()]).then(([sub, id]) => {
      setSubscription(sub)
      setClinicaId(id)
      setCargando(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') setSuccess(true)
  }, [searchParams])

  async function handleUpgrade(plan: Plan) {
    if (!clinicaId) return
    setLoading(plan)
    setError(null)
    try {
      const res  = await fetch('/api/flow/checkout', {
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

  async function handleUpdateCard() {
    if (!clinicaId) return
    setLoading('portal')
    setError(null)
    try {
      const res  = await fetch('/api/flow/portal', {
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

  if (cargando) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-[13px] text-gray-400">
        <Loader2 className="size-4 animate-spin" />Cargando plan…
      </div>
    )
  }

  const plans: Plan[] = ['free', 'pro', 'clinica']

  return (
    <div>
      {success && (
        <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[13px] text-emerald-700 font-medium">
          ✓ ¡Suscripción activada correctamente!
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* Plan actual */}
      {subscription && (
        <CurrentPlanCard
          subscription={subscription}
          clinicaId={clinicaId ?? ''}
          onUpdateCard={handleUpdateCard}
          onCancel={() => setShowCancelModal(true)}
          loading={loading}
        />
      )}

      {/* Toggle mensual / anual */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <span className={`text-[13px] font-medium ${!anual ? 'text-gray-900' : 'text-gray-400'}`}>Mensual</span>
        <button
          onClick={() => setAnual(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${anual ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${anual ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className={`text-[13px] font-medium ${anual ? 'text-gray-900' : 'text-gray-400'}`}>
          Anual
          <span className="ml-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">−20%</span>
        </span>
      </div>

      {/* Comparación de planes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map(plan => (
          <PlanCard
            key={plan}
            plan={plan}
            isCurrent={subscription?.plan === plan}
            clinicaId={clinicaId}
            onUpgrade={handleUpgrade}
            loading={loading}
            anual={anual}
          />
        ))}
      </div>

      {clinicaId && (
        <CancelacionModal
          open={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          clinicaId={clinicaId}
        />
      )}

      <div className="mt-5 p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
        <p className="text-[12px] text-[#2563EB] font-medium">
          💡 Una sola hora recuperada por recordatorios automáticos ya paga el plan mensual completo.
        </p>
      </div>
      <p className="mt-3 text-[11px] text-gray-400 text-center">
        Precios en pesos chilenos (CLP) · IVA incluido · Cancela cuando quieras
      </p>
    </div>
  )
}
