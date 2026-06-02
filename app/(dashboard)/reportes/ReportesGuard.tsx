'use client'

import { PlanGate } from '@/components/subscriptions/PlanGate'
import { TrialFeatureBanner } from '@/components/subscriptions/TrialFeatureBanner'

export function ReportesGuard({ children }: { children: React.ReactNode }) {
  return (
    <PlanGate feature="reportes">
      <TrialFeatureBanner feature="reportes" />
      {children}
    </PlanGate>
  )
}
