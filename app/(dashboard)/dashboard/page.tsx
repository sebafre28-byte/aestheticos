import Link from 'next/link'
import {
  CalendarDays, Clock3, DollarSign, TrendingUp, TrendingDown,
  UserPlus, CheckCircle2, XCircle,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProximasCitas } from '@/components/dashboard/ProximasCitas'
import { TopServicios } from '@/components/dashboard/TopServicios'
import { GraficoVentas } from '@/components/dashboard/GraficoVentas'
import { getDashboardData } from '@/lib/dashboard/queries'

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function variacionPct(actual: number, anterior: number): { pct: number; subio: boolean } {
  if (anterior === 0) return { pct: actual > 0 ? 100 : 0, subio: actual >= 0 }
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  return { pct: Math.abs(pct), subio: pct >= 0 }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const varPacientes = data.pacientesNuevos.mesActual - data.pacientesNuevos.mesAnterior
  const varIngresos = variacionPct(data.ingresosMes, data.ingresosMesAnterior)

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6">

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#0B132B]">Dashboard</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/agenda" className="h-8 px-3 rounded-lg bg-[#2563EB] text-white text-[12px] font-medium flex items-center hover:bg-blue-700 transition-colors">
          + Nueva cita
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          title="Citas hoy"
          value={String(data.citasHoy.total)}
          detail={`${data.citasHoy.confirmadas} confirmadas · ${data.citasHoy.pendientes} pendientes`}
          subtitle="Total del día"
          icon={CalendarDays}
          accent="primary"
        />
        <MetricCard
          title="Ingresos hoy"
          value={formatCLP(data.ingresosHoy)}
          detail="Cobros registrados hoy"
          subtitle="CLP cobrado"
          icon={DollarSign}
          accent="teal"
        />
        <MetricCard
          title="Ocupación semanal"
          value={`${data.ocupacionSemanal.tasa}%`}
          detail={`${data.ocupacionSemanal.realizadas}/${data.ocupacionSemanal.slotsDisponibles} slots`}
          subtitle="Completadas vs capacidad"
          icon={Clock3}
          accent="navy"
        />
        <MetricCard
          title="Pacientes nuevos"
          value={String(data.pacientesNuevos.mesActual)}
          detail={varPacientes >= 0 ? `+${varPacientes} vs mes anterior` : `${varPacientes} vs mes anterior`}
          subtitle="Este mes"
          icon={UserPlus}
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[12px] text-slate-400 font-medium mb-1">Ingresos del mes</p>
          <p className="text-[26px] font-bold text-[#0B132B] leading-tight">{formatCLP(data.ingresosMes)}</p>
          <div className={`flex items-center gap-1 mt-1 text-[12px] font-medium ${varIngresos.subio ? 'text-emerald-600' : 'text-red-500'}`}>
            {varIngresos.subio ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {varIngresos.pct}% vs mes anterior ({formatCLP(data.ingresosMesAnterior)})
          </div>
        </div>

        <div className="sm:col-span-1 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[12px] text-slate-400 font-medium mb-1">Citas del mes</p>
          <p className="text-[26px] font-bold text-[#0B132B] leading-tight">{data.citasMes.total}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="size-3.5" />{data.citasMes.completadas} completadas
            </div>
            <div className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
              <XCircle className="size-3.5" />{data.citasMes.canceladas} canceladas
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            {data.citasMes.total > 0 && (
              <div className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.round((data.citasMes.completadas / data.citasMes.total) * 100)}%` }} />
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {data.citasMes.total > 0 ? Math.round((data.citasMes.completadas / data.citasMes.total) * 100) : 0}% tasa de completitud
          </p>
        </div>

        <div className="sm:col-span-1 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[12px] text-slate-400 font-medium mb-1">Ticket promedio</p>
          <p className="text-[26px] font-bold text-[#0B132B] leading-tight">
            {data.citasMes.completadas > 0
              ? formatCLP(Math.round(data.ingresosMes / data.citasMes.completadas))
              : formatCLP(0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Por cita completada este mes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.8fr_1fr]">
        <div className="overflow-x-auto">
          <GraficoVentas
            data={data.ventasUltimos6Meses}
            mesActual={data.ingresosMes}
            mesAnterior={data.ingresosMesAnterior}
          />
        </div>
        <div className="overflow-x-auto">
          <TopServicios servicios={data.topServicios} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <ProximasCitas citas={data.proximasCitas} />
      </div>
    </div>
  )
}
