'use client'

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { VentasMesItem } from '@/lib/dashboard/queries'

type Props = {
  data: VentasMesItem[]
  mesActual: number
  mesAnterior: number
}

function formatCLP(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-lg text-[12px]">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600">
          {p.name === 'ingresos'
            ? `Ingresos: ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(p.value)}`
            : `Citas: ${p.value}`}
        </p>
      ))}
    </div>
  )
}

export function GraficoVentas({ data, mesActual, mesAnterior }: Props) {
  const variacion = mesAnterior > 0
    ? Math.round(((mesActual - mesAnterior) / mesAnterior) * 100)
    : mesActual > 0 ? 100 : 0
  const subio = variacion >= 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[13px] font-semibold text-[#0B132B]">Ingresos por mes</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Últimos 6 meses</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-bold text-[#0B132B] leading-tight">
            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(mesActual)}
          </p>
          <p className={`text-[11px] font-medium mt-0.5 ${subio ? 'text-emerald-600' : 'text-red-500'}`}>
            {subio ? '▲' : '▼'} {Math.abs(variacion)}% vs mes anterior
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatCLP} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', radius: 4 }} />
          <Bar dataKey="ingresos" name="ingresos" fill="#2563EB" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoVentasSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-1">
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-1 text-right">
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200 ml-auto" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200 ml-auto" />
        </div>
      </div>
      <div className="h-[180px] animate-pulse rounded-lg bg-slate-100" />
    </div>
  )
}
