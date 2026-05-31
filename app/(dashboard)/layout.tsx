import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { needsOnboarding } from '@/lib/onboarding/queries-server'
import { TrialBanner } from '@/components/subscriptions/TrialBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (await needsOnboarding()) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TrialBanner />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
