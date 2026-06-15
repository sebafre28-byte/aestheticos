import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMarketingEmail } from '@/lib/marketing/emails'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const incoming = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || incoming !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all clinics with auto-reactivacion enabled
  const { data: clinicas } = await supabase
    .from('clinicas')
    .select('id, nombre, logo_url, slug, configuracion')

  if (!clinicas?.length) return NextResponse.json({ ok: true, procesadas: 0 })

  const stats = { clinicas: 0, enviados: 0, omitidos: 0 }

  for (const clinica of clinicas) {
    const config = (clinica.configuracion as Record<string, unknown> | null) ?? {}
    const marketing = (config.marketing as Record<string, unknown> | null) ?? {}

    // Only run if auto-reactivacion is enabled
    if (!marketing.reactivacion_auto) continue

    const dias = (marketing.reactivacion_dias as number) ?? 60
    const mensaje = (marketing.mensaje_reactivacion as string | null) ?? null
    const bookUrl = clinica.slug
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'}/book/${clinica.slug}`
      : null

    const fechaCorte = new Date()
    fechaCorte.setDate(fechaCorte.getDate() - dias)

    // Patients with email, active, no cita since cutoff
    const { data: pacientes } = await supabase
      .from('pacientes')
      .select('id, nombre, email')
      .eq('clinica_id', clinica.id)
      .eq('activo', true)
      .not('email', 'is', null)

    if (!pacientes?.length) continue

    const { data: citasRecientes } = await supabase
      .from('citas')
      .select('paciente_id')
      .eq('clinica_id', clinica.id)
      .gte('inicio', fechaCorte.toISOString())
      .not('estado', 'eq', 'cancelada')

    const conCitaReciente = new Set((citasRecientes ?? []).map(c => c.paciente_id))
    const inactivos = pacientes.filter(p => !conCitaReciente.has(p.id) && p.email)

    for (const p of inactivos) {
      if (!p.email) continue

      // Dedup: no reactivation to same patient in last 30 days
      const { data: reciente } = await supabase
        .from('whatsapp_logs')
        .select('id')
        .eq('clinica_id', clinica.id)
        .eq('paciente_id', p.id)
        .eq('tipo', 'email_reactivacion')
        .gte('enviado_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (reciente) { stats.omitidos++; continue }

      const ok = await sendMarketingEmail({
        tipo: 'email_reactivacion',
        destinatario: p.email,
        datos: {
          paciente_nombre: p.nombre,
          clinica_nombre: clinica.nombre,
          clinica_logo_url: clinica.logo_url ?? null,
          dias_sin_cita: dias,
          book_url: bookUrl,
          mensaje_personalizado: mensaje,
        },
      })

      if (ok) {
        await supabase.from('whatsapp_logs').insert({
          clinica_id: clinica.id,
          paciente_id: p.id,
          tipo: 'email_reactivacion',
          enviado_at: new Date().toISOString(),
          canal: 'email',
        })
        stats.enviados++
      }
    }

    stats.clinicas++
  }

  if (stats.enviados === 0 && stats.clinicas === 0) {
    return NextResponse.json({ ok: true, msg: 'Ninguna clínica con reactivación automática activa', ...stats })
  }

  Sentry.captureMessage(`[cron/marketing-reactivacion] ${stats.enviados} emails enviados`, { level: 'info', extra: stats })
  console.log('[marketing-reactivacion]', stats)
  return NextResponse.json({ ok: true, ...stats })
}
