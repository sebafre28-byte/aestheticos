'use client'

import { useState } from 'react'
import { LockIcon } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { TrialBanner } from '@/components/subscriptions/TrialBanner'
import { usePresenceBroadcast } from '@/lib/auth/usePresence'
import { useSubscripcion } from '@/lib/subscriptions/useSubscripcion'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  usePresenceBroadcast()
  const { trialVencido, plan, estado, cargando } = useSubscripcion()
  const bloqueado = !cargando && trialVencido && estado !== 'activa' && !['pro', 'clinica'].includes(plan ?? '')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {bloqueado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center mx-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LockIcon className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-[18px] font-bold text-gray-900 mb-2">Tu período de prueba venció</h2>
            <p className="text-[14px] text-gray-500 mb-6">Activa un plan para seguir usando SimpliClinic y gestionar tu clínica.</p>
            <a
              href="/configuracion?tab=planes"
              className="block w-full h-11 rounded-xl bg-[#2563EB] text-white font-semibold text-[14px] flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              Ver planes
            </a>
          </div>
        </div>
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
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </div>
    </div>
  )
}
