import { MetricCardSkeleton } from '@/components/dashboard/MetricCard'
import { ProximasCitasSkeleton } from '@/components/dashboard/ProximasCitas'
import { TopServiciosSkeleton } from '@/components/dashboard/TopServicios'

export default function LoadingDashboardPage() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <ProximasCitasSkeleton />
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <TopServiciosSkeleton />
      </div>
    </div>
  )
}
