'use client'

import { useRouter } from 'next/navigation'

type MesOption = { year: number; month: number; label: string }

export function SelectorMes({
  meses,
  selectedYear,
  selectedMonth,
}: {
  meses: MesOption[]
  selectedYear: number
  selectedMonth: number
}) {
  const router = useRouter()
  const currentValue = `${selectedYear}-${selectedMonth}`

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [year, month] = e.target.value.split('-')
    router.push(`/reportes?year=${year}&month=${month}`)
  }

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-[#0B132B] font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:hidden"
    >
      {meses.map((m) => (
        <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
          {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
        </option>
      ))}
    </select>
  )
}
