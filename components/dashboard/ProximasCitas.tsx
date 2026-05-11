import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProximaCitaItem } from '@/lib/dashboard/queries'

type ProximasCitasProps = {
  citas: ProximaCitaItem[]
}

const estadoClasses: Record<ProximaCitaItem['estado'], string> = {
  confirmada: 'bg-[#14B8A6]/10 text-[#14B8A6]',
  pendiente: 'bg-amber-100 text-amber-700',
  completada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-rose-100 text-rose-700',
  no_asistio: 'bg-slate-200 text-slate-700',
}

const estadoLabel: Record<ProximaCitaItem['estado'], string> = {
  confirmada: 'Confirmada',
  pendiente: 'Pendiente',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistio',
}

export function ProximasCitas({ citas }: ProximasCitasProps) {
  return (
    <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-none">
      <CardHeader className="px-4 pb-3 pt-4">
        <CardTitle className="text-sm font-semibold text-[#0B132B]">Proximas 5 citas de hoy</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        {citas.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500">No hay citas pendientes para hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {citas.map((cita) => (
              <li key={cita.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-12 shrink-0 text-sm font-semibold text-[#2563EB]">{cita.hora}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0B132B]">{cita.paciente}</p>
                  <p className="truncate text-xs text-slate-500">
                    {cita.servicio} · {cita.profesional}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${estadoClasses[cita.estado]}`}
                >
                  {estadoLabel[cita.estado]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function ProximasCitasSkeleton() {
  return (
    <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-none">
      <CardHeader className="px-4 pb-3 pt-4">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent className="px-0 pb-1">
        <ul className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
