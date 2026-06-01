import { CalendarCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProximaCitaItem } from '@/lib/dashboard/queries'

type ProximasCitasProps = {
  citas: ProximaCitaItem[]
}

const estadoDot: Record<ProximaCitaItem['estado'], string> = {
  confirmada: 'bg-[#14B8A6]',
  pendiente: 'bg-amber-400',
  completada: 'bg-emerald-500',
  cancelada: 'bg-rose-400',
  no_asistio: 'bg-slate-400',
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
  no_asistio: 'No asistió',
}

export function ProximasCitas({ citas }: ProximasCitasProps) {
  return (
    <Card className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm">
      <CardHeader className="px-6 pb-3 pt-5">
        <CardTitle className="text-sm font-semibold text-[#0B132B]">Próximas citas de hoy</CardTitle>
        <p className="text-[11px] text-slate-400 mt-0.5">Las siguientes 5 citas programadas</p>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {citas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB]/10 mb-3">
              <CalendarCheck className="h-6 w-6 text-[#2563EB]" />
            </div>
            <p className="text-sm font-semibold text-[#0B132B]">Sin citas pendientes</p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-[200px]">
              Todo al día — disfruta el momento tranquilo
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {citas.map((cita) => (
              <li key={cita.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col items-center shrink-0 w-12">
                  <span className="text-[13px] font-bold text-[#2563EB] leading-tight">{cita.hora}</span>
                </div>
                <div className={`shrink-0 h-2 w-2 rounded-full ${estadoDot[cita.estado]}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0B132B]">{cita.paciente}</p>
                  <p className="truncate text-[11px] text-slate-400 mt-0.5">
                    {cita.servicio} · {cita.profesional}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${estadoClasses[cita.estado]}`}
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
    <Card className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm">
      <CardHeader className="px-6 pb-3 pt-5">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200 mt-1" />
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <ul className="divide-y divide-slate-50">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index} className="flex items-center gap-3 px-6 py-3">
              <div className="h-4 w-10 animate-pulse rounded bg-slate-200" />
              <div className="h-2 w-2 animate-pulse rounded-full bg-slate-200" />
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
