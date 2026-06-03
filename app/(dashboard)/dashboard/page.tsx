import Link from 'next/link'
import {
  CalendarDays, Clock3, DollarSign, Users, TrendingUp, TrendingDown,
  RotateCcw, AlertCircle, Banknote, Plus,
} from 'lucide-react'
import SaludoHeader from '@/components/dashboard/SaludoHeader'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProximasCitas } from '@/components/dashboard/ProximasCitas'
import { TopServicios } from '@/components/dashboard/TopServicios'
import { GraficoVentas } from '@/components/dashboard/GraficoVentas'
import { GraficoCitasSemana } from '@/components/dashboard/GraficoCitasSemana'
import { getDashboardData, getDashboardDataProfe } from '@/lib/dashboard/queries'
import { createClient } from '@/lib/supabase/server'
import { DashboardProfe } from '@/components/dashboard/DashboardProfe'

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

function OcupacionColor({ tasa }: { tasa: number }) {
  if (tasa > 80) return <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
  if (tasa >= 50) return <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const [{ data: rol }, { data: profesionalId }] = await Promise.all([
    supabase.rpc('auth_rol_usuario'),
    supabase.rpc('auth_profesional_id'),
  ])

  if (rol === 'profesional' && profesionalId) {
    const profeData = await getDashboardDataProfe(profesionalId)
    return <DashboardProfe data={profeData} />
  }

  const data = await getDashboardData()

  const varIngresos = variacionPct(data.ingresosMes, data.ingresosMesAnterior)
  const ticketPromedio = data.citasMes.completadas > 0
    ? Math.round(data.ingresosMes / data.citasMes.completadas)
    : 0
  const progressIngresos = data.ingresosMesAnterior > 0
    ? Math.min(100, Math.round((data.ingresosMes / data.ingresosMesAnterior) * 100))
    : data.ingresosMes > 0 ? 100 : 0

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 p-6" style={{ background: '#F8FAFF', minHeight: '100vh' }}>

      {/* Zona A — Header */}
      <div className="flex items-end justify-between">
        <div>
          <SaludoHeader />
        </div>
        <Link
          href="/agenda"
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </Link>
      </div>

      {/* Zona B — 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {/* KPI 1: Citas hoy */}
        <MetricCard
          title="Citas hoy"
          value={String(data.citasHoy.total)}
          detail={`${data.citasHoy.confirmadas} conf · ${data.citasHoy.pendientes} pend · ${data.citasHoy.completadas} comp`}
          icon={CalendarDays}
          accent="primary"
        />

        {/* KPI 2: Ingresos del mes */}
        <MetricCard
          title="Ingresos del mes"
          value={formatCLP(data.ingresosMes)}
          detail={`vs ${formatCLP(data.ingresosMesAnterior)} mes anterior`}
          icon={DollarSign}
          accent="teal"
          trend={{ valor: varIngresos.pct, subio: varIngresos.subio }}
          progress={progressIngresos}
        />

        {/* KPI 3: Ocupación semanal */}
        <div className="gap-0 border border-slate-100 bg-white rounded-2xl py-0 shadow-sm">
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

        {/* KPI 4: Tasa de retorno */}
        <MetricCard
          title="Pacientes recurrentes"
          value={`${data.tasaRetornoMes}%`}
          detail={`${data.pacientesNuevos.mesActual} pacientes nuevos este mes`}
          icon={RotateCcw}
          accent="primary"
        />
      </div>

      {/* Zona C — Indicadores secundarios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Ticket promedio */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium mb-2">Ticket promedio</p>
          <p className="text-2xl font-bold text-[#0B132B]">{formatCLP(ticketPromedio)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Por cita completada este mes</p>
        </div>

        {/* Tasa de cancelación */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Tasa de cancelación</p>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.tasaCancelacion > 20 ? 'text-red-500 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
              {data.tasaCancelacion > 20 ? 'Alta' : 'Normal'}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-[#0B132B]">{data.tasaCancelacion}%</p>
            {data.tasaCancelacion > 20
              ? <AlertCircle className="h-4 w-4 text-red-400 mb-0.5" />
              : <TrendingDown className="h-4 w-4 text-emerald-500 mb-0.5" />
            }
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {data.citasPorEstadoMes.cancelada + data.citasPorEstadoMes.no_asistio} canceladas / {data.citasMes.total} totales
          </p>
        </div>

        {/* Ingresos proyectados */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">Ingresos proyectados</p>
            <Banknote className="h-4 w-4 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-[#0B132B]">{formatCLP(data.ingresosProyectadosMes)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3.5 w-3.5 text-[#14B8A6]" />
            <p className="text-[11px] text-[#14B8A6] font-medium">Cobrado + pendiente de cobrar</p>
          </div>
        </div>
      </div>

      {/* Zona D — Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GraficoVentas
            data={data.ventasUltimos6Meses}
            mesActual={data.ingresosMes}
            mesAnterior={data.ingresosMesAnterior}
          />
        </div>
        <div>
          <GraficoCitasSemana data={data.citasPorDiaSemana} />
        </div>
      </div>

      {/* Zona E — Tabla de profesionales */}
      {data.profesionalStats.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#0B132B]">Rendimiento del equipo</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Este mes</p>
            </div>
            <Users className="h-4 w-4 text-slate-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left text-[11px] text-slate-400 uppercase tracking-wide font-medium pb-3">Profesional</th>
                  <th className="text-right text-[11px] text-slate-400 uppercase tracking-wide font-medium pb-3">Citas</th>
                  <th className="text-right text-[11px] text-slate-400 uppercase tracking-wide font-medium pb-3">Ingresos</th>
                  <th className="text-right text-[11px] text-slate-400 uppercase tracking-wide font-medium pb-3">Ocup.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.profesionalStats.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: prof.color || '#2563EB' }}
                        >
                          {prof.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#0B132B] truncate max-w-[140px]">{prof.nombre}</span>
                      </div>
                    </td>
                    <td className="text-right text-sm font-semibold text-[#0B132B] py-3">{prof.citasMes}</td>
                    <td className="text-right text-sm font-semibold text-[#0B132B] py-3">{formatCLP(prof.ingresosMes)}</td>
                    <td className="text-right text-[12px] text-slate-400 py-3">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zona F — ProximasCitas + TopServicios */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <ProximasCitas citas={data.proximasCitas} />
        <TopServicios servicios={data.topServicios} />
      </div>

    </div>
  )
}
