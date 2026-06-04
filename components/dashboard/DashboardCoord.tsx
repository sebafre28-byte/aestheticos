import Link from 'next/link'
import { CalendarDays, Clock3, RotateCcw, Plus } from 'lucide-react'
import SaludoHeader from '@/components/dashboard/SaludoHeader'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProximasCitas } from '@/components/dashboard/ProximasCitas'
import { TopServicios } from '@/components/dashboard/TopServicios'
import { GraficoCitasSemana } from '@/components/dashboard/GraficoCitasSemana'
import type { DashboardData } from '@/lib/dashboard/queries'

function OcupacionColor({ tasa }: { tasa: number }) {
  if (tasa > 80) return <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
  if (tasa >= 50) return <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
}

export function DashboardCoord({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-5 p-6" style={{ background: '#F8FAFF', minHeight: '100vh' }}>

      <div className="flex items-end justify-between">
        <SaludoHeader />
        <Link
          href="/agenda"
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </Link>
      </div>

      {/* KPIs — solo métricas de citas, sin $$ */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <MetricCard
          title="Citas hoy"
          value={String(data.citasHoy.total)}
          detail={`${data.citasHoy.confirmadas} conf · ${data.citasHoy.pendientes} pend · ${data.citasHoy.completadas} comp`}
          icon={CalendarDays}
          accent="primary"
        />

        <div className="border border-slate-100 bg-white rounded-2xl shadow-sm">
          <div className="flex flex-row items-center justify-between px-6 pb-2 pt-5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Ocupación semanal</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0B132B] bg-[#0B132B]/10">
              <Clock3 className="h-4 w-4" />
            </div>
          </div>
          <div className="px-6 pb-5 space-y-2">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold tracking-tight text-[#0B132B]">{data.ocupacionSemanal.tasa}%</p>
              <OcupacionColor tasa={data.ocupacionSemanal.tasa} />
            </div>
            <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, data.ocupacionSemanal.tasa)}%`,
                  backgroundColor: data.ocupacionSemanal.tasa > 80 ? '#F87171' : data.ocupacionSemanal.tasa >= 50 ? '#FBBF24' : '#34D399',
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">{data.ocupacionSemanal.realizadas}/{data.ocupacionSemanal.slotsDisponibles} slots completados</p>
          </div>
        </div>

        <MetricCard
          title="Pacientes recurrentes"
          value={`${data.tasaRetornoMes}%`}
          detail={`${data.pacientesNuevos.mesActual} pacientes nuevos este mes`}
          icon={RotateCcw}
          accent="primary"
        />
      </div>

      {/* Tasa de cancelación */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Tasa de cancelación</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.tasaCancelacion > 20 ? 'text-red-500 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
              {data.tasaCancelacion > 20 ? 'Alta' : 'Normal'}
            </span>
          </div>
          <p className="text-2xl font-bold text-[#0B132B]">{data.tasaCancelacion}%</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {data.citasPorEstadoMes.cancelada + data.citasPorEstadoMes.no_asistio} canceladas / {data.citasMes.total} totales
          </p>
        </div>

        <GraficoCitasSemana data={data.citasPorDiaSemana} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <ProximasCitas citas={data.proximasCitas} />
        <TopServicios servicios={data.topServicios} />
      </div>
    </div>
  )
}
