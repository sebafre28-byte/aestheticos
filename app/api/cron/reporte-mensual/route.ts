import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReporteMensualEmail } from '@/lib/marketing/emails'

export const runtime = 'nodejs'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const incoming = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || incoming !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'

  // Calcular rango del mes anterior
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const mesNombre = MESES[inicioMes.getMonth()]
  const anio = inicioMes.getFullYear()

  const { data: clinicas } = await supabase
    .from('clinicas')
    .select('id, nombre, email, logo_url, configuracion')
    .not('email', 'is', null)

  if (!clinicas?.length) return NextResponse.json({ ok: true, enviados: 0 })

  const stats = { enviados: 0, omitidos: 0, errores: 0 }

  for (const clinica of clinicas) {
    if (!clinica.email) continue

    // Dedup: solo 1 reporte por clínica por mes
    const { data: yaEnviado } = await supabase
      .from('whatsapp_logs')
      .select('id')
      .eq('clinica_id', clinica.id)
      .eq('tipo_mensaje', 'email_reporte_mensual')
      .gte('created_at', inicioMes.toISOString())
      .maybeSingle()

    if (yaEnviado) { stats.omitidos++; continue }

    // Obtener stats del mes
    const { data: citas } = await supabase
      .from('citas')
      .select('estado, servicios(precio)')
      .eq('clinica_id', clinica.id)
      .gte('inicio', inicioMes.toISOString())
      .lt('inicio', finMes.toISOString())

    const { data: pacientesNuevos } = await supabase
      .from('pacientes')
      .select('id')
      .eq('clinica_id', clinica.id)
      .gte('created_at', inicioMes.toISOString())
      .lt('created_at', finMes.toISOString())

    const total_citas = citas?.length ?? 0
    const citas_completadas = citas?.filter(c => c.estado === 'completada').length ?? 0
    const citas_canceladas = citas?.filter(c => c.estado === 'cancelada').length ?? 0
    const ingresos_total = (citas ?? [])
      .filter(c => c.estado === 'completada')
      .reduce((sum, c) => {
        const svc = Array.isArray(c.servicios) ? c.servicios[0] : c.servicios
        return sum + (Number((svc as { precio?: number } | null)?.precio) || 0)
      }, 0)
    const pacientes_nuevos = pacientesNuevos?.length ?? 0

    // No enviar si no hubo actividad
    if (total_citas === 0 && pacientes_nuevos === 0) { stats.omitidos++; continue }

    const { subject, html } = buildReporteMensualEmail({
      clinica_nombre: clinica.nombre,
      clinica_logo_url: clinica.logo_url ?? null,
      mes_nombre: mesNombre,
      anio,
      total_citas,
      citas_completadas,
      citas_canceladas,
      ingresos_total,
      pacientes_nuevos,
      dashboard_url: `${appUrl}/agenda`,
    })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) { stats.errores++; continue }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'SimpliClinic <hola@simpliclinic.cl>',
        to: [clinica.email],
        subject,
        html,
      }),
    })

    if (res.ok) {
      await supabase.from('whatsapp_logs').insert({
        clinica_id: clinica.id,
        tipo_mensaje: 'email_reporte_mensual',
        canal: 'email',
      })
      stats.enviados++
    } else {
      stats.errores++
    }
  }

  Sentry.captureMessage(`[cron/reporte-mensual] ${stats.enviados} reportes enviados`, { level: 'info', extra: stats })
  console.log('[reporte-mensual]', { mes: `${mesNombre} ${anio}`, ...stats })
  return NextResponse.json({ ok: true, mes: `${mesNombre} ${anio}`, ...stats })
}
