import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchEmail } from '@/app/api/email/route'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // Canceladas hace entre 7 y 8 días
  const hace7d = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString()
  const hace8d = new Date(now.getTime() - 8 * 24 * 3600_000).toISOString()

  const { data: canceladas } = await supabase
    .from('subscriptions')
    .select('clinica_id, clinicas(nombre, email)')
    .eq('estado', 'cancelada')
    .lte('updated_at', hace7d)
    .gte('updated_at', hace8d)

  let enviados = 0
  for (const row of canceladas ?? []) {
    const clinica = Array.isArray(row.clinicas) ? row.clinicas[0] : row.clinicas
    const email = (clinica as { email?: string | null } | null)?.email
    const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? 'tu clínica'
    if (!email) continue
    await dispatchEmail({
      tipo: 'winback',
      destinatario: email,
      datos: { clinica_nombre: nombre } as never,
    }).catch(err => console.error('[winback-emails]', err))
    enviados++
  }

  return NextResponse.json({ ok: true, enviados })
}
