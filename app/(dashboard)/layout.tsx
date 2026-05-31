import { redirect } from 'next/navigation'
import { needsOnboarding } from '@/lib/onboarding/queries-server'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (await needsOnboarding()) {
    redirect('/onboarding')
  }

  return <DashboardShell>{children}</DashboardShell>
}
