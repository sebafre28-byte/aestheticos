import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { needsOnboarding } from '@/lib/onboarding/queries-server'

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
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
