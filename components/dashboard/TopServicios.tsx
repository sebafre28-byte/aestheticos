import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TopServicioItem } from '@/lib/dashboard/queries'

type Props = { servicios: TopServicioItem[] }

const COLORS = ['#2563EB', '#14B8A6', '#8B5CF6', '#F59E0B', '#EF4444']

function formatCLP(v: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
}

export function TopServicios({ servicios }: Props) {
  const maxTotal = Math.max(...servicios.map((s) => s.total), 1)

  return (
    <Card className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm h-full">
      <CardHeader className="px-6 pb-3 pt-5">
        <CardTitle className="text-sm font-semibold text-[#0B132B]">Top servicios — esta semana</CardTitle>
        <p className="text-[11px] text-slate-400 mt-0.5">Servicios más solicitados</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {servicios.length === 0 ? (
          <p className="text-sm text-slate-400">No hay servicios agendados esta semana.</p>
        ) : (
          <ol className="space-y-4">
            {servicios.map((s, i) => {
              const pct = Math.round((s.total / maxTotal) * 100)
              return (
                <li key={s.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: COLORS[i] ?? '#94A3B8' }}>
                        {i + 1}
                      </div>
                      <p className="truncate text-[12px] font-semibold text-[#0B132B]">{s.nombre}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[12px] font-bold text-[#0B132B]">{formatCLP(s.ingresos)}</p>
                      <p className="text-[10px] text-slate-400">{s.total} cita{s.total !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i] ?? '#94A3B8' }} />
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export function TopServiciosSkeleton() {
  return (
    <Card className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm">
      <CardHeader className="px-6 pb-3 pt-5">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-3.5 w-16 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
