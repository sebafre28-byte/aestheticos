'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { TrialBanner } from '@/components/subscriptions/TrialBanner'
import { PaywallOverlay } from '@/components/subscriptions/PaywallOverlay'
import { usePresenceBroadcast } from '@/lib/auth/usePresence'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  usePresenceBroadcast()
  const { trialVencido, plan, estado, cargando, planLabel, esTrial, trialDiasRestantes } = useSubscripcion()

  // Bloqueo por suscripción cancelada o pausada
  const bloqueadoPorSuscripcion = !cargando && (estado === 'cancelada' || estado === 'pausada')

  // Bloqueo legacy: trial vencido sin plan pago
  const bloqueadoPorTrial = !cargando && trialVencido && estado !== 'activa' && !['pro', 'clinica'].includes(plan ?? '')

  // Banner de aviso (no bloqueante): trial vence en menos de 2 días
  const mostrarAvisoTrial = !cargando && esTrial && !trialVencido && trialDiasRestantes !== null && trialDiasRestantes <= 2

  // Fecha formateada para el banner de aviso
  const fechaVencimiento = mostrarAvisoTrial
    ? new Date(Date.now() + (trialDiasRestantes ?? 0) * 24 * 60 * 60 * 1000).toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
      })
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {/* Paywall: suscripción pausada o cancelada */}
      {bloqueadoPorSuscripcion && (
        <PaywallOverlay estado={estado as 'cancelada' | 'pausada'} planLabel={planLabel} />
      )}

      {/* Paywall legacy: trial vencido sin plan pago */}
      {!bloqueadoPorSuscripcion && bloqueadoPorTrial && (
        <PaywallOverlay estado="cancelada" planLabel={planLabel} />
      )}

      {/* Desktop sidebar — always visible md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Mobile top header */}
      <MobileHeader onOpenSidebar={() => setSidebarOpen(true)} />

      {/* Main content — push down on mobile for fixed header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TrialBanner />
        {/* Banner de aviso: trial próximo a vencer (no bloqueante) */}
        {mostrarAvisoTrial && (
          <div className="bg-amber-400 text-amber-900 py-2 px-4 flex items-center justify-between gap-4 text-[13px]">
            <span className="flex-1 text-center font-medium">
              Tu prueba vence el {fechaVencimiento}. Activa un plan para no perder el acceso.
            </span>
            <Link
              href="/configuracion?tab=plan"
              className="bg-amber-900/15 hover:bg-amber-900/25 transition-colors px-3 py-1 rounded-full text-[12px] font-semibold shrink-0"
            >
              Ver planes
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  )
}
