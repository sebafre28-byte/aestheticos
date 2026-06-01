import { ReportesGuard } from './ReportesGuard'
import { getReporteData, getMesesDisponibles } from '@/lib/reportes/queries'
import { formatCLP } from '@/lib/cobros/utils'
import { SelectorMes } from '@/components/reportes/SelectorMes'
import { ExportButtons } from '@/components/reportes/ExportButtons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SearchParams = Promise<{ year?: string; month?: string }>

const estadoConfig: Record<string, { label: string; className: string }> = {
  completada: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700' },
  confirmada: { label: 'Confirmada', className: 'bg-blue-100 text-blue-700' },
  pendiente: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  no_asistio: { label: 'No asistió', className: 'bg-red-100 text-red-700' },
}

export default async function ReportesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: rol } = await supabase.rpc('auth_rol_usuario')
  if (rol !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year) : now.getFullYear()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1

  const [reporte, meses] = await Promise.all([
    getReporteData(year, month),
    getMesesDisponibles(),
  ])

  const { resumen, citas, topServicios, mesLabel } = reporte

  const kpis = [
    { label: 'Total citas', value: resumen.totalCitas, suffix: '' },
    { label: 'Completadas', value: resumen.completadas, suffix: '' },
    { label: 'Canceladas', value: resumen.canceladas, suffix: '' },
    { label: 'Ingresos totales', value: formatCLP(resumen.ingresosTotales), suffix: '' },
  ]

  return (
    <ReportesGuard>
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[22px] font-bold text-[#0B132B] leading-tight">Reportes</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SelectorMes meses={meses} selectedYear={year} selectedMonth={month} />
          <ExportButtons citas={citas} mesLabel={mesLabel} year={year} month={month} />
        </div>
      </div>

      {/* Print header — visible only on print */}
      <div className="hidden print:flex print:flex-col print:gap-1 print:mb-4">
        <h1 className="text-xl font-bold text-[#0B132B]">Reporte mensual — SimpliClinic</h1>
        <p className="text-sm text-slate-600">{mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-5 print:shadow-none print:border-slate-300"
          >
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-1.5 text-[24px] font-bold text-[#0B132B] leading-tight">
              {kpi.value}{kpi.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Tabla de citas */}
        <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-5 print:shadow-none print:border-slate-300">
          <h2 className="text-[14px] font-semibold text-[#0B132B] mb-4">Detalle de citas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Fecha</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Hora</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Paciente</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Servicio</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Profesional</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Estado</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {citas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No hay citas para este período
                    </td>
                  </tr>
                ) : (
                  citas.map((c) => {
                    const d = new Date(c.inicio)
                    const estadoCfg = estadoConfig[c.estado] ?? { label: c.estado, className: 'bg-slate-100 text-slate-600' }
                    const monto =
                      c.pago_estado === 'pagado' || c.pago_estado === 'parcial'
                        ? formatCLP(c.pago_monto)
                        : '—'
                    return (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-3 text-[#0B132B]">
                          {format(d, 'dd/MM/yyyy')}
                        </td>
                        <td className="py-2.5 pr-3 text-[#0B132B]">
                          {format(d, 'HH:mm')}
                        </td>
                        <td className="py-2.5 pr-3 text-[#0B132B] font-medium">{c.paciente}</td>
                        <td className="py-2.5 pr-3 text-[#0B132B]">{c.servicio}</td>
                        <td className="py-2.5 pr-3 text-[#0B132B]">{c.profesional}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoCfg.className}`}>
                            {estadoCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-[#0B132B]">{monto}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 print:shadow-none print:border-slate-300">
            <h2 className="text-[14px] font-semibold text-[#0B132B] mb-4">Resumen</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-500">Ticket promedio</span>
                <span className="text-[13px] font-semibold text-[#0B132B]">
                  {formatCLP(resumen.ticketPromedio)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-500">Pacientes únicos</span>
                <span className="text-[13px] font-semibold text-[#0B132B]">
                  {resumen.pacientesAtendidos}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-500">Pendientes</span>
                <span className="text-[13px] font-semibold text-amber-600">
                  {resumen.pendientes}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 print:shadow-none print:border-slate-300">
            <h2 className="text-[14px] font-semibold text-[#0B132B] mb-4">Top servicios</h2>
            {topServicios.length === 0 ? (
              <p className="text-[12px] text-slate-400">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {topServicios.map((s, i) => (
                  <div key={s.nombre} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#0B132B] truncate">{s.nombre}</p>
                        <p className="text-[11px] text-slate-400">{s.total} cita{s.total !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold text-[#0B132B] shrink-0">
                      {formatCLP(s.ingresos)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block print:mt-8 print:pt-4 print:border-t print:border-slate-200">
        <p className="text-[11px] text-slate-500 text-center">
          Generado por SimpliClinic — {format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}
        </p>
      </div>
    </div>
    </ReportesGuard>
  )
}
