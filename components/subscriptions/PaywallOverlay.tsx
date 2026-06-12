'use client'

import { useState } from 'react'
import { AlertCircle, XCircle, Mail } from 'lucide-react'
import Link from 'next/link'

type EstadoBloqueo = 'cancelada' | 'pausada'

interface PaywallOverlayProps {
  estado: EstadoBloqueo
  planLabel?: string | null
}

export function PaywallOverlay({ estado, planLabel }: PaywallOverlayProps) {
  const [loadingPortal, setLoadingPortal] = useState(false)

  const esPausada = estado === 'pausada'

  const titulo = esPausada ? 'Pago pendiente' : 'Suscripción cancelada'
  const descripcion = esPausada
    ? 'Tu suscripción está pausada por un pago fallido. Actualiza tu método de pago para continuar.'
    : 'Tu período de prueba ha terminado. Activa un plan para seguir usando SimpliClinic.'

  const IconComponent = esPausada ? AlertCircle : XCircle
  const iconBg = esPausada ? 'bg-amber-100' : 'bg-red-100'
  const iconColor = esPausada ? 'text-amber-500' : 'text-red-500'

  async function handlePortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/flow/portal', { method: 'POST' })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      }
    } catch {
      setLoadingPortal(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center mx-4">
        {/* Icon */}
        <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <IconComponent className={`w-8 h-8 ${iconColor}`} />
        </div>

        {/* Title */}
        <h2 className="text-[18px] font-bold text-[#0B132B] mb-2">{titulo}</h2>

        {/* Description */}
        <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">{descripcion}</p>

        {/* Primary CTA */}
        <Link
          href="/configuracion?tab=plan"
          className="block w-full h-11 rounded-xl bg-[#2563EB] text-white font-semibold text-[14px] flex items-center justify-center hover:bg-blue-700 transition-colors mb-3"
        >
          Activar plan
        </Link>

        {/* Secondary CTA — only for pausada */}
        {esPausada && (
          <button
            onClick={handlePortal}
            disabled={loadingPortal}
            className="w-full h-11 rounded-xl border border-gray-200 text-[#0B132B] font-semibold text-[14px] flex items-center justify-center hover:bg-gray-50 transition-colors mb-5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingPortal ? 'Redirigiendo…' : 'Actualizar método de pago'}
          </button>
        )}

        {/* Help text */}
        <p className="text-[12px] text-gray-400 flex items-center justify-center gap-1 mt-2">
          <Mail className="w-3.5 h-3.5" />
          <span>
            ¿Necesitas ayuda? Escríbenos a{' '}
            <a href="mailto:hola@simpliclinic.cl" className="underline hover:text-gray-600">
              hola@simpliclinic.cl
            </a>
          </span>
        </p>
      </div>
    </div>
  )
}
