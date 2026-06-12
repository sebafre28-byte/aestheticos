import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchEmail } from '@/app/api/email/route'

export const runtime = 'nodejs'

// Runs daily. Sends:
//   - Day 5 of trial (2 days left warning)
//   - Day 7 of trial (trial expired)
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  // ── Day-5 warning: trial_ends_at is between 47h and 49h from now ──────────
  const in47h = new Date(now.getTime() + 47 * 3600_000).toISOString()
  const in49h = new Date(now.getTime() + 49 * 3600_000).toISOString()

  const { data: warning5 } = await supabase
    .from('subscriptions')
    .select('clinica_id, trial_ends_at, clinicas(nombre, email)')
    .eq('estado', 'trial')
    .gte('trial_ends_at', in47h)
    .lte('trial_ends_at', in49h)

  let enviados5 = 0
  for (const row of warning5 ?? []) {
    const clinica = Array.isArray(row.clinicas) ? row.clinicas[0] : row.clinicas
    const email = (clinica as { email?: string | null } | null)?.email
    const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? 'tu clínica'
    if (!email) continue
    await dispatchEmail({
      tipo: 'trial_expira_pronto',
      destinatario: email,
      datos: { clinica_nombre: nombre, dias_restantes: 2 } as never,
    }).catch(err => console.error('[trial-emails] day5 error:', err))
    enviados5++
  }

  // ── Day-7 expired: trial_ends_at passed in the last 24h ───────────────────
  const hace24h = new Date(now.getTime() - 24 * 3600_000).toISOString()

  const { data: expired } = await supabase
    .from('subscriptions')
    .select('clinica_id, trial_ends_at, clinicas(nombre, email)')
    .eq('estado', 'trial')
    .lte('trial_ends_at', now.toISOString())
    .gte('trial_ends_at', hace24h)

  let enviados7 = 0
  for (const row of expired ?? []) {
    const clinica = Array.isArray(row.clinicas) ? row.clinicas[0] : row.clinicas
    const email = (clinica as { email?: string | null } | null)?.email
    const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? 'tu clínica'
    if (!email) continue
    await dispatchEmail({
      tipo: 'trial_vencido',
      destinatario: email,
      datos: { clinica_nombre: nombre } as never,
    }).catch(err => console.error('[trial-emails] day7 error:', err))

    // Flip estado to cancelada
    await supabase
      .from('subscriptions')
      .update({ estado: 'cancelada', updated_at: now.toISOString() })
      .eq('clinica_id', row.clinica_id)
    enviados7++
  }

  return NextResponse.json({ ok: true, warning_enviados: enviados5, expirados_enviados: enviados7 })
}
