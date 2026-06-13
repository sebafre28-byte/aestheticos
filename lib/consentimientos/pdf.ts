import type { jsPDF } from 'jspdf'

export type ConsentimientoPDFData = {
  clinica_nombre: string
  paciente_nombre: string
  servicio_nombre: string
  fecha_cita: string
  email_destino: string
  firmado_at: string
  titulo: string
  contenido: string
  firma_img: string // dataURL base64
}

export async function generarConsentimientoPDF(data: ConsentimientoPDFData): Promise<jsPDF> {
  const { default: JsPDF } = await import('jspdf')
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 18
  const contentW = W - margin * 2
  let y = 0

  // ─── Header band ─────────────────────────────────────────────────────────────
  doc.setFillColor(109, 40, 217) // purple-700
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(data.titulo, margin, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(data.clinica_nombre, margin, 20)

  doc.setFillColor(255, 255, 255)
  doc.setTextColor(109, 40, 217)
  doc.roundedRect(W - 52, 5, 34, 18, 3, 3, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('SimpliClinic', W - 50, 12)
  doc.setFont('helvetica', 'normal')
  doc.text('Firma Digital', W - 50, 18)

  y = 38

  // ─── Info del paciente ────────────────────────────────────────────────────────
  doc.setFillColor(245, 243, 255)
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F')
  doc.setDrawColor(221, 214, 254)
  doc.roundedRect(margin, y, contentW, 30, 3, 3, 'S')

  doc.setTextColor(80, 80, 80)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('PACIENTE', margin + 4, y + 7)
  doc.text('PROCEDIMIENTO', margin + contentW / 2 + 2, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(data.paciente_nombre, margin + 4, y + 14)
  doc.text(data.servicio_nombre, margin + contentW / 2 + 2, y + 14)

  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('FECHA CITA', margin + 4, y + 22)
  doc.text('EMAIL', margin + contentW / 2 + 2, y + 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(data.fecha_cita, margin + 4, y + 28)
  doc.text(data.email_destino, margin + contentW / 2 + 2, y + 28)

  y += 38

  // ─── Contenido del consentimiento ─────────────────────────────────────────────
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  const lineas = doc.splitTextToSize(data.contenido, contentW)
  const altoTexto = lineas.length * 4.5
  const pageH = 297

  // Paginar si es necesario
  for (let i = 0; i < lineas.length; i++) {
    if (y + 5 > pageH - 20) {
      doc.addPage()
      y = 18
    }
    doc.text(lineas[i], margin, y)
    y += 4.8
  }

  y += 8

  // ─── Sección de firma ─────────────────────────────────────────────────────────
  if (y + 60 > pageH - 10) {
    doc.addPage()
    y = 18
  }

  doc.setDrawColor(220, 220, 230)
  doc.setLineWidth(0.3)
  doc.line(margin, y, W - margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Firma del paciente', margin, y)
  y += 6

  // Firma imagen
  const firmaW = 90
  const firmaH = 35
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(margin, y, firmaW, firmaH, 2, 2, 'FD')

  try {
    doc.addImage(data.firma_img, 'PNG', margin + 2, y + 2, firmaW - 4, firmaH - 4)
  } catch {}

  // Datos firma a la derecha
  const rx = margin + firmaW + 8
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('FIRMADO EL', rx, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8.5)
  doc.text(data.firmado_at, rx, y + 14)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('ENVIADO A', rx, y + 24)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(8.5)
  doc.text(data.email_destino, rx, y + 30)

  y += firmaH + 10

  // ─── Footer ──────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(248, 250, 252)
    doc.rect(0, pageH - 12, W, 12, 'F')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text(`Documento generado por SimpliClinic · ${data.clinica_nombre}`, margin, pageH - 5)
    doc.text(`Pág. ${p} / ${totalPages}`, W - margin, pageH - 5, { align: 'right' })
  }

  return doc
}
