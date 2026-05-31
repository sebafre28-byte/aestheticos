'use client'

import { PlanGate } from '@/components/subscriptions/PlanGate'

export function ReportesGuard({ children }: { children: React.ReactNode }) {
  return <PlanGate feature="reportes">{children}</PlanGate>
}
