import { CalendarDays, Users, Clock3 } from 'lucide-react'
import SaludoHeader from '@/components/dashboard/SaludoHeader'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProximasCitas } from '@/components/dashboard/ProximasCitas'
import type { DashboardProfeData } from '@/lib/dashboard/queries'

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export function DashboardProfe({ data }: { data: DashboardProfeData }) {
  return (
    <div className="mx-auto max-w-[1280px] space-y-5 p-6" style={{ background: '#F8FAFF', minHeight: '100vh' }}>
      <div className="flex items-end justify-between">
        <div>
          <SaludoHeader />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <MetricCard
          title="Citas hoy"
          value={String(data.citasHoy.total)}
          detail={`${data.citasHoy.confirmadas} conf · ${data.citasHoy.pendientes} pend · ${data.citasHoy.completadas} comp`}
          icon={CalendarDays}
          accent="primary"
        />
        <MetricCard
          title="Citas este mes"
          value={String(data.citasMes)}
          icon={Clock3}
          accent="navy"
        />
        <MetricCard
          title="Pacientes únicos"
          value={String(data.pacientesUnicos)}
          detail="Este mes"
          icon={Users}
          accent="primary"
        />
      </div>

      {data.proximasCitas.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <h2 className="text-[13px] font-semibold text-slate-700 mb-4">Próximas citas hoy</h2>
          <ProximasCitas citas={data.proximasCitas} />
        </div>
      )}

      {data.proximasCitas.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-8 text-center">
          <p className="text-[14px] text-slate-400">No tienes más citas programadas para hoy.</p>
        </div>
      )}
    </div>
  )
}
