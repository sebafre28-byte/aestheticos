import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMarketingEmail } from '@/lib/marketing/emails'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const hoy = new Date()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0')
    const dia = String(hoy.getDate()).padStart(2, '0')

    // Fetch all clinicas with marketing_cumpleanos enabled
    const { data: clinicas } = await supabase
      .from('clinicas')
      .select('id, nombre, logo_url, configuracion')

    let enviados = 0
    let errores = 0

    for (const clinica of clinicas ?? []) {
      const config = (clinica.configuracion ?? {}) as Record<string, unknown>
      const marketingConfig = (config.marketing ?? {}) as Record<string, unknown>
      if (!marketingConfig.cumpleanos) continue

      const mensajePersonalizado = (marketingConfig.mensaje_cumpleanos as string | undefined) ?? null

      // Find patients with birthday today and email
      const { data: pacientes } = await supabase
        .from('pacientes')
        .select('id, nombre, email, fecha_nacimiento')
        .eq('clinica_id', clinica.id)
        .eq('activo', true)
        .not('email', 'is', null)
        .not('fecha_nacimiento', 'is', null)
        .like('fecha_nacimiento', `%-${mes}-${dia}`)

      for (const p of pacientes ?? []) {
        if (!p.email) continue

        // Check if already sent this year
        const thisYear = hoy.getFullYear()
        const { data: existing } = await supabase
          .from('whatsapp_logs')
          .select('id')
          .eq('clinica_id', clinica.id)
          .eq('paciente_id', p.id)
          .eq('tipo', 'email_cumpleanos')
          .gte('enviado_at', `${thisYear}-01-01`)
          .maybeSingle()

        if (existing) continue

        const ok = await sendMarketingEmail({
          tipo: 'email_cumpleanos',
          destinatario: p.email,
          datos: {
            paciente_nombre: p.nombre,
            clinica_nombre: clinica.nombre,
            clinica_logo_url: clinica.logo_url ?? null,
            mensaje_personalizado: mensajePersonalizado,
          },
        })

        if (ok) {
          await supabase.from('whatsapp_logs').insert({
            clinica_id: clinica.id,
            paciente_id: p.id,
            tipo: 'email_cumpleanos',
            enviado_at: new Date().toISOString(),
            canal: 'email',
          })
          enviados++
        } else {
          errores++
        }
      }
    }

    return NextResponse.json({ ok: true, enviados, errores })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
