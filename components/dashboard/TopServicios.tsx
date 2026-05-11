import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TopServicioItem } from '@/lib/dashboard/queries'

type TopServiciosProps = {
  servicios: TopServicioItem[]
}

export function TopServicios({ servicios }: TopServiciosProps) {
  return (
    <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-none">
      <CardHeader className="px-4 pb-3 pt-4">
        <CardTitle className="text-sm font-semibold text-[#0B132B]">Top 3 servicios esta semana</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {servicios.length === 0 ? (
          <p className="text-sm text-slate-500">No hay servicios agendados esta semana.</p>
        ) : (
          <ol className="space-y-3">
            {servicios.map((servicio, index) => (
              <li key={servicio.id} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB]/10 text-xs font-bold text-[#2563EB]">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0B132B]">{servicio.nombre}</p>
                  <p className="text-xs text-slate-500">{servicio.total} citas</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function TopServiciosSkeleton() {
  return (
    <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-none">
      <CardHeader className="px-4 pb-3 pt-4">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
