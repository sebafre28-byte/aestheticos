'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { TrialBanner } from '@/components/subscriptions/TrialBanner'
import { usePresenceBroadcast } from '@/lib/auth/usePresence'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  usePresenceBroadcast()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
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
