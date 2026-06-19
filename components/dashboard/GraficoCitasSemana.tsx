'use client'

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from 'recharts'

type Props = {
  data: { dia: string; citas: number }[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-[12px]">
      <p className="font-semibold text-gray-900 mb-0.5">{label}</p>
      <p className="text-gray-500">{payload[0]?.value ?? 0} citas</p>
    </div>
  )
}

export function GraficoCitasSemana({ data }: Props) {
  const maxCitas = Math.max(...data.map((d) => d.citas), 1)

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm h-full">
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0B132B]">Citas por día</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Distribución semanal — este mes</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" barSize={16} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="dia"
            tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFF' }} />
          <Bar dataKey="citas" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => {
              const opacity = maxCitas > 0 ? 0.3 + (entry.citas / maxCitas) * 0.7 : 0.3
              return <Cell key={`cell-${index}`} fill={`rgba(37, 99, 235, ${opacity})`} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoCitasSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="space-y-1 mb-5">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="h-[220px] animate-pulse rounded-lg bg-slate-100" />
    </div>
  )
}
