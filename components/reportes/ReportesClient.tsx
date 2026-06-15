'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatCLP } from '@/lib/cobros/utils'
import type { ReporteData } from '@/lib/reportes/queries'
import { SelectorMes } from './SelectorMes'
import { ExportButtons } from './ExportButtons'
import { ArrowUpRight, ArrowDownRight, Minus, ChevronUp, ChevronDown, Search, SlidersHorizontal } from 'lucide-react'

type MesOption = { year: number; month: number; label: string }

type Props = {
  reporte: ReporteData
  meses: MesOption[]
}

const ESTADO_CONFIG: Record<string, { label: string; chipClass: string; color: string }> = {
  completada: { label: 'Completada', chipClass: 'bg-emerald-100 text-emerald-700', color: '#10B981' },
  confirmada:  { label: 'Confirmada',  chipClass: 'bg-blue-100 text-blue-700',    color: '#2563EB' },
  pendiente:   { label: 'Pendiente',   chipClass: 'bg-amber-100 text-amber-700',  color: '#F59E0B' },
  cancelada:   { label: 'Cancelada',   chipClass: 'bg-red-100 text-red-700',      color: '#EF4444' },
  no_asistio:  { label: 'No asistió',  chipClass: 'bg-slate-100 text-slate-600',  color: '#94A3B8' },
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-slate-400">—</span>
  const up = value >= 0
  const color = up ? 'text-emerald-600' : 'text-red-500'
  const Icon = value === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="size-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function formatCLPShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

type SortKey = 'inicio' | 'pago_monto' | null
type SortDir = 'asc' | 'desc'

export function ReportesClient({ reporte, meses }: Props) {
  const { citas, resumen, topServicios, ingresosPorDia, mesAnteriorResumen,
          profesionales, servicios, mesLabel, year, month } = reporte

  // Filters
  const [busqueda, setBusqueda] = useState('')
  const [filtroProfesional, setFiltroProfesional] = useState('')
  const [filtroServicio, setFiltroServicio] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('inicio')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showFilters, setShowFilters] = useState(false)

  const pctIngresos = pctChange(resumen.ingresosTotales, mesAnteriorResumen.ingresosTotales)

  // Pie data
  const pieData = [
    { name: 'Completada', value: resumen.completadas,                              color: ESTADO_CONFIG.completada.color },
    { name: 'Confirmada', value: citas.filter(c => c.estado === 'confirmada').length, color: ESTADO_CONFIG.confirmada.color },
    { name: 'Pendiente',  value: resumen.pendientes,                               color: ESTADO_CONFIG.pendiente.color },
    { name: 'Cancelada',  value: citas.filter(c => c.estado === 'cancelada').length,  color: ESTADO_CONFIG.cancelada.color },
    { name: 'No asistió', value: resumen.noShows,                                  color: ESTADO_CONFIG.no_asistio.color },
  ].filter(d => d.value > 0)

  // Filtered + sorted citas
  const citasFiltradas = useMemo(() => {
    let result = [...citas]
    if (busqueda) result = result.filter(c => c.paciente.toLowerCase().includes(busqueda.toLowerCase()))
    if (filtroProfesional) result = result.filter(c => c.profesional === filtroProfesional)
    if (filtroServicio) result = result.filter(c => c.servicio === filtroServicio)
    if (filtroEstado) result = result.filter(c => c.estado === filtroEstado)
    if (sortKey) {
      result.sort((a, b) => {
        const va = sortKey === 'inicio' ? new Date(a.inicio).getTime() : a.pago_monto
        const vb = sortKey === 'inicio' ? new Date(b.inicio).getTime() : b.pago_monto
        return sortDir === 'asc' ? va - vb : vb - va
      })
    }
    return result
  }, [citas, busqueda, filtroProfesional, filtroServicio, filtroEstado, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="size-3 text-slate-300" />
    return sortDir === 'asc' ? <ChevronUp className="size-3 text-blue-500" /> : <ChevronDown className="size-3 text-blue-500" />
  }

  const kpis = [
    { label: 'Total citas', value: resumen.totalCitas, sub: null, badge: null },
    { label: 'Completadas', value: resumen.completadas, sub: null, badge: null },
    { label: 'Canceladas', value: resumen.canceladas, sub: null, badge: null },
    { label: 'Tasa no-show', value: `${resumen.tasaNoShow.toFixed(1).replace('.', ',')}%`, sub: null, badge: null, warn: resumen.tasaNoShow > 15 },
    { label: 'Ingresos totales', value: formatCLP(resumen.ingresosTotales), sub: 'vs mes anterior', badge: pctIngresos, big: true },
    { label: 'Ticket promedio', value: formatCLP(resumen.ticketPromedio), sub: null, badge: null },
    { label: 'Pacientes únicos', value: resumen.pacientesAtendidos, sub: null, badge: null },
    { label: 'Pendientes', value: resumen.pendientes, sub: null, badge: null, warn: resumen.pendientes > 5 },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 min-h-full bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[22px] font-bold text-[#0B132B] leading-tight">Reportes</h1>
          <p className="text-[13px] text-slate-500 mt-0.5 capitalize">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <SelectorMes meses={meses} selectedYear={year} selectedMonth={month} />
          <ExportButtons citas={citasFiltradas} resumen={resumen} topServicios={topServicios} mesLabel={mesLabel} year={year} month={month} />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:flex print:flex-col print:gap-1 print:mb-4">
        <h1 className="text-xl font-bold text-[#0B132B]">Reporte mensual — SimpliClinic</h1>
        <p className="text-sm text-slate-600 capitalize">{mesLabel}</p>
      </div>

      {/* KPI cards — 4 cols */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 print:shadow-none print:border-slate-300">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className={`mt-1.5 text-[22px] font-bold leading-tight ${kpi.warn ? 'text-amber-600' : 'text-[#0B132B]'}`}>
              {kpi.value}
            </p>
            {(kpi.sub || kpi.badge !== undefined) && (
              <div className="mt-1 flex items-center gap-1">
                {kpi.sub && <span className="text-[11px] text-slate-400">{kpi.sub}</span>}
                {kpi.badge !== undefined && <PctBadge value={kpi.badge as number | null} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 print:hidden">
        {/* Ingresos por día */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-[13px] font-semibold text-[#0B132B] mb-4">Ingresos por día</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ingresosPorDia} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCLPShort} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                formatter={(v: unknown) => [formatCLP(v as number), 'Ingresos']}
                labelFormatter={(l) => `Día ${l}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="ingresos" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución de estados */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-[13px] font-semibold text-[#0B132B] mb-4">Distribución de estados</h2>
          {pieData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-[13px]">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#475569' }}>{v}</span>} />
                <Tooltip formatter={(v: unknown) => [`${v} citas`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top servicios chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 print:hidden">
        <h2 className="text-[13px] font-semibold text-[#0B132B] mb-4">Top servicios por ingresos</h2>
        {topServicios.length === 0 ? (
          <p className="text-[13px] text-slate-400">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, topServicios.length * 36)}>
            <BarChart data={topServicios} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={formatCLPShort} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12, fill: '#0F172A' }} tickLine={false} axisLine={false} width={140} />
              <Tooltip formatter={(v: unknown) => [formatCLP(v as number), 'Ingresos']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Bar dataKey="ingresos" fill="#7C3AED" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table section */}
      <div className="rounded-xl border border-slate-200 bg-white print:shadow-none print:border-slate-300">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 print:hidden">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <SlidersHorizontal className="size-4" />
              Filtros
              {(filtroProfesional || filtroServicio || filtroEstado) && (
                <span className="ml-1 size-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {[filtroProfesional, filtroServicio, filtroEstado].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-3">
              <select
                value={filtroProfesional}
                onChange={e => setFiltroProfesional(e.target.value)}
                className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos los profesionales</option>
                {profesionales.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={filtroServicio}
                onChange={e => setFiltroServicio(e.target.value)}
                className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos los servicios</option>
                {servicios.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos los estados</option>
                {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {(filtroProfesional || filtroServicio || filtroEstado || busqueda) && (
                <button
                  onClick={() => { setFiltroProfesional(''); setFiltroServicio(''); setFiltroEstado(''); setBusqueda('') }}
                  className="px-3 py-2 text-[13px] text-slate-500 hover:text-slate-700"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-[#0B132B]">
              Detalle de citas
              <span className="ml-2 text-[12px] font-normal text-slate-400">({citasFiltradas.length} resultado{citasFiltradas.length !== 1 ? 's' : ''})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">
                    <button onClick={() => toggleSort('inicio')} className="flex items-center gap-1 hover:text-slate-600">
                      Fecha <SortIcon col="inicio" />
                    </button>
                  </th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Hora</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Paciente</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Servicio</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Profesional</th>
                  <th className="text-left py-2 pr-3 text-slate-400 font-medium">Estado</th>
                  <th className="text-right py-2 text-slate-400 font-medium">
                    <button onClick={() => toggleSort('pago_monto')} className="flex items-center gap-1 ml-auto hover:text-slate-600">
                      Monto <SortIcon col="pago_monto" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {citasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No hay citas para los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  citasFiltradas.map((c) => {
                    const d = new Date(c.inicio)
                    const estadoCfg = ESTADO_CONFIG[c.estado] ?? { label: c.estado, chipClass: 'bg-slate-100 text-slate-600', color: '#94A3B8' }
                    const monto = c.pago_estado === 'pagado' || c.pago_estado === 'parcial' ? formatCLP(c.pago_monto) : '—'
                    return (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-3 text-[#0B132B]">{format(d, 'dd/MM/yyyy', { locale: es })}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{format(d, 'HH:mm')}</td>
                        <td className="py-2.5 pr-3 text-[#0B132B] font-medium">{c.paciente}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{c.servicio}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{c.profesional}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoCfg.chipClass}`}>
                            {estadoCfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-medium text-[#0B132B]">{monto}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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
  )
}
