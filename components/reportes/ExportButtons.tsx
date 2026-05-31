'use client'

import { Printer, Download } from 'lucide-react'
import type { CitaReporteRow } from '@/lib/reportes/queries'
import { format } from 'date-fns'

type Props = {
  citas: CitaReporteRow[]
  mesLabel: string
  year: number
  month: number
}

export function ExportButtons({ citas, mesLabel, year, month }: Props) {
  function handleExportCSV() {
    const BOM = '﻿'
    const headers = ['Fecha', 'Hora', 'Paciente', 'Servicio', 'Profesional', 'Estado', 'Monto']
    const rows = citas.map((c) => {
      const d = new Date(c.inicio)
      const fecha = format(d, 'dd/MM/yyyy')
      const hora = format(d, 'HH:mm')
      const monto =
        c.pago_estado === 'pagado' || c.pago_estado === 'parcial' ? c.pago_monto : 0
      return [
        fecha,
        hora,
        `"${c.paciente.replace(/"/g, '""')}"`,
        `"${c.servicio.replace(/"/g, '""')}"`,
        `"${c.profesional.replace(/"/g, '""')}"`,
        c.estado,
        monto,
      ].join(',')
    })
    const csv = BOM + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${month.toString().padStart(2, '0')}-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#0B132B] shadow-sm hover:bg-slate-50 transition-colors"
      >
        <Download className="size-4 text-slate-500" />
        Exportar CSV
      </button>
      <button
        onClick={handlePrint}
        className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        <Printer className="size-4" />
        Imprimir PDF
      </button>
    </div>
  )
}
