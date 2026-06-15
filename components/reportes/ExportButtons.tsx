'use client'

import { useState } from 'react'
import { Download, FileText, Sheet, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCLP } from '@/lib/cobros/utils'
import type { CitaReporteRow } from '@/lib/reportes/queries'

type Resumen = {
  totalCitas: number; completadas: number; canceladas: number; pendientes: number
  noShows: number; tasaNoShow: number; ingresosTotales: number
  ticketPromedio: number; pacientesAtendidos: number
}

type TopServicio = { nombre: string; total: number; ingresos: number }

type Props = {
  citas: CitaReporteRow[]
  resumen: Resumen
  topServicios: TopServicio[]
  mesLabel: string
  year: number
  month: number
}

const ESTADO_LABEL: Record<string, string> = {
  completada: 'Completada', confirmada: 'Confirmada', pendiente: 'Pendiente',
  cancelada: 'Cancelada', no_asistio: 'No asistió',
}

function dl(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function ExportButtons({ citas, resumen, topServicios, mesLabel, year, month }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const mesCapitalized = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)
  const filename = `reporte-${month.toString().padStart(2, '0')}-${year}`

  function handleCSV() {
    const BOM = '﻿'
    const headers = ['Fecha', 'Hora', 'Paciente', 'Servicio', 'Profesional', 'Estado', 'Monto']
    const rows = citas.map((c) => {
      const d = new Date(c.inicio)
      const monto = c.pago_estado === 'pagado' || c.pago_estado === 'parcial' ? c.pago_monto : 0
      return [format(d, 'dd/MM/yyyy'), format(d, 'HH:mm'),
        `"${c.paciente.replace(/"/g, '""')}"`, `"${c.servicio.replace(/"/g, '""')}"`,
        `"${c.profesional.replace(/"/g, '""')}"`, ESTADO_LABEL[c.estado] ?? c.estado, monto].join(',')
    })
    dl(new Blob([BOM + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`)
    setOpen(false)
  }

  function handleExcel() {
    const sep = '\t'
    const rows = [
      [`REPORTE MENSUAL — ${mesCapitalized.toUpperCase()}`], [],
      ['RESUMEN'],
      ['Total citas', resumen.totalCitas], ['Completadas', resumen.completadas],
      ['Canceladas', resumen.canceladas], ['No asistió', resumen.noShows],
      ['Pendientes', resumen.pendientes], ['Tasa no-show', `${resumen.tasaNoShow.toFixed(1)}%`],
      ['Ingresos totales', resumen.ingresosTotales], ['Ticket promedio', resumen.ticketPromedio],
      ['Pacientes únicos', resumen.pacientesAtendidos], [],
      ['TOP SERVICIOS'], ['Servicio', 'Citas', 'Ingresos'],
      ...topServicios.map(s => [s.nombre, s.total, s.ingresos]), [],
      ['DETALLE DE CITAS'],
      ['Fecha', 'Hora', 'Paciente', 'Servicio', 'Profesional', 'Estado', 'Monto'],
      ...citas.map(c => {
        const d = new Date(c.inicio)
        const monto = c.pago_estado === 'pagado' || c.pago_estado === 'parcial' ? c.pago_monto : 0
        return [format(d, 'dd/MM/yyyy'), format(d, 'HH:mm'), c.paciente, c.servicio, c.profesional, ESTADO_LABEL[c.estado] ?? c.estado, monto]
      }),
    ]
    dl(new Blob(['﻿' + rows.map(r => r.join(sep)).join('\n')], { type: 'text/tab-separated-values;charset=utf-8;' }), `${filename}.xls`)
    setOpen(false)
  }

  async function handlePDF() {
    setLoading('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const blue: [number, number, number] = [37, 99, 235]
      const purple: [number, number, number] = [124, 58, 237]
      const dark: [number, number, number] = [15, 23, 42]
      const slate: [number, number, number] = [71, 85, 105]
      const rowAlt: [number, number, number] = [248, 250, 252]

      const addFooter = (pageNum: number) => {
        const total = doc.getNumberOfPages()
        doc.setFontSize(8); doc.setTextColor(...slate)
        doc.text(`Página ${pageNum} de ${total}`, W / 2, H - 8, { align: 'center' })
        doc.text('SimpliClinic — Confidencial', 14, H - 8)
      }

      // Header
      doc.setFillColor(...blue)
      doc.rect(0, 0, W, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text('SimpliClinic', 14, 12)
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text('Reporte Mensual de Atenciones', 14, 20)
      doc.setFontSize(10)
      doc.text(mesCapitalized, 14, 27)
      doc.setFontSize(8)
      doc.text(`Emitido: ${format(new Date(), "dd 'de' MMMM yyyy, HH:mm", { locale: es })}`, W - 14, 27, { align: 'right' })

      let y = 38

      // KPI summary
      doc.setTextColor(...dark); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('Resumen ejecutivo', 14, y); y += 4

      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: [
          ['Total de citas', String(resumen.totalCitas)],
          ['Citas completadas', String(resumen.completadas)],
          ['Citas canceladas', String(resumen.canceladas)],
          ['No asistieron', String(resumen.noShows)],
          ['Pendientes', String(resumen.pendientes)],
          ['Tasa de no-show', `${resumen.tasaNoShow.toFixed(1)}%`],
          ['Ingresos totales', formatCLP(resumen.ingresosTotales)],
          ['Ticket promedio', formatCLP(resumen.ticketPromedio)],
          ['Pacientes únicos atendidos', String(resumen.pacientesAtendidos)],
        ],
        theme: 'grid',
        headStyles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: dark },
        alternateRowStyles: { fillColor: rowAlt },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'right' as const } },
        margin: { left: 14, right: 14 },
      })

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

      if (topServicios.length > 0) {
        if (y > 230) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...dark)
        doc.text('Top servicios por ingresos', 14, y); y += 4

        autoTable(doc, {
          startY: y,
          head: [['Servicio', 'Citas', 'Ingresos']],
          body: topServicios.map(s => [s.nombre, String(s.total), formatCLP(s.ingresos)]),
          theme: 'grid',
          headStyles: { fillColor: purple, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: dark },
          alternateRowStyles: { fillColor: rowAlt },
          columnStyles: { 1: { halign: 'center' as const, cellWidth: 20 }, 2: { halign: 'right' as const, cellWidth: 38 } },
          margin: { left: 14, right: 14 },
        })

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      }

      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...dark)
      doc.text(`Detalle de citas (${citas.length})`, 14, y); y += 4

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Hora', 'Paciente', 'Servicio', 'Profesional', 'Estado', 'Monto']],
        body: citas.map(c => {
          const d = new Date(c.inicio)
          const monto = c.pago_estado === 'pagado' || c.pago_estado === 'parcial' ? formatCLP(c.pago_monto) : '—'
          return [format(d, 'dd/MM/yyyy'), format(d, 'HH:mm'), c.paciente, c.servicio, c.profesional, ESTADO_LABEL[c.estado] ?? c.estado, monto]
        }),
        theme: 'grid',
        headStyles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: dark },
        alternateRowStyles: { fillColor: rowAlt },
        columnStyles: {
          0: { cellWidth: 22 }, 1: { cellWidth: 13 }, 2: { cellWidth: 33 },
          3: { cellWidth: 30 }, 4: { cellWidth: 28 }, 5: { cellWidth: 22 }, 6: { halign: 'right' as const, cellWidth: 22 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: { pageNumber: number }) => addFooter(data.pageNumber),
      })

      // Add footer to first page too if table didn't start there
      addFooter(1)

      doc.save(`${filename}.pdf`)
    } catch (err) {
      console.error('[ExportButtons] PDF error:', err)
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  return (
    <div className="relative print:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        <Download className="size-4" />
        Exportar
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <button onClick={handleCSV} className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#0B132B] hover:bg-slate-50 transition-colors">
              <Sheet className="size-4 text-emerald-600" />
              Exportar CSV
            </button>
            <button onClick={handleExcel} className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#0B132B] hover:bg-slate-50 transition-colors border-t border-slate-100">
              <Sheet className="size-4 text-blue-600" />
              Exportar Excel
            </button>
            <button onClick={handlePDF} disabled={loading === 'pdf'} className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#0B132B] hover:bg-slate-50 transition-colors border-t border-slate-100 disabled:opacity-50">
              <FileText className="size-4 text-red-500" />
              {loading === 'pdf' ? 'Generando…' : 'Exportar PDF'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
