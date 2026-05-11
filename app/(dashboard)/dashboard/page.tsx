import Link from 'next/link'
import { CalendarDays, Clock3, DollarSign, UserPlus, Users } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProximasCitas } from '@/components/dashboard/ProximasCitas'
import { TopServicios } from '@/components/dashboard/TopServicios'
import { getDashboardData } from '@/lib/dashboard/queries'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const variacionPacientes = data.pacientesNuevos.mesActual - data.pacientesNuevos.mesAnterior
  const pacientesComparativo =
    variacionPacientes >= 0
      ? `+${variacionPacientes} vs mes anterior`
      : `${variacionPacientes} vs mes anterior`

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-[#0B132B] sm:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Métricas operativas en tiempo real de SimpliClinic</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Citas hoy"
          value={String(data.citasHoy.total)}
          detail={`${data.citasHoy.confirmadas} confirmadas · ${data.citasHoy.pendientes} pendientes`}
          subtitle="Total del día"
          icon={CalendarDays}
          accent="primary"
        />
        <MetricCard
          title="Ingresos del día"
          value={formatCurrency(data.ingresosHoy)}
          detail="Suma de servicios agendados hoy"
          subtitle="CLP"
          icon={DollarSign}
          accent="teal"
        />
        <MetricCard
          title="Ocupación semanal"
          value={`${data.ocupacionSemanal.tasa}%`}
          detail={`${data.ocupacionSemanal.realizadas}/${data.ocupacionSemanal.slotsDisponibles} slots`}
          subtitle="Realizadas vs capacidad"
          icon={Clock3}
          accent="navy"
        />
        <MetricCard
          title="Pacientes nuevos"
          value={String(data.pacientesNuevos.mesActual)}
          detail={pacientesComparativo}
          subtitle="Mes actual vs anterior"
          icon={UserPlus}
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <ProximasCitas citas={data.proximasCitas} />
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2563EB]" />
                <p className="text-sm font-semibold text-[#0B132B]">Resumen de actividad</p>
              </div>
              <Link href="/agenda" className="text-xs font-semibold text-[#2563EB] hover:underline">
                Ver agenda completa
              </Link>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Hoy tienes {data.citasHoy.total} citas y una ocupación semanal del {data.ocupacionSemanal.tasa}%.
            </p>
          </div>
        </div>
        <TopServicios servicios={data.topServicios} />
      </div>
    </div>
  )
}
