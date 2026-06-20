import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchEmail } from '@/app/api/email/route'

export const runtime = 'nodejs'

// Runs hourly. Sends:
//   - Day 1: onboarding setup reminder
//   - Day 3: share booking page nudge
//   - Day 5: trial expires soon warning
//   - Day 7: trial expired

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'

// Returns clinics whose trial started between (nowMinusEnd, nowMinusStart]
async function getTrialEnDia(supabase: ReturnType<typeof createAdminClient>, now: Date, diaInicio: number, diaFin: number) {
  const msInicio = diaInicio * 24 * 3600_000
  const msFin = diaFin * 24 * 3600_000
  // trial_ends_at = created_at + 7 días
  // Si el trial dura 7 días y queremos clínicas en día N:
  // trial_ends_at está entre (now + (7-diaFin)d, now + (7-diaInicio)d]
  const desde = new Date(now.getTime() + (7 * 24 * 3600_000) - msFin).toISOString()
  const hasta = new Date(now.getTime() + (7 * 24 * 3600_000) - msInicio).toISOString()
  return supabase
    .from('subscriptions')
    .select('clinica_id, clinicas(id, nombre, email, slug)')
    .eq('estado', 'trial')
    .gt('trial_ends_at', desde)
    .lte('trial_ends_at', hasta)
}

function dedup(supabase: ReturnType<typeof createAdminClient>, clinicaId: string, tipo: string) {
  return supabase
    .from('whatsapp_logs')
    .select('id')
    .eq('clinica_id', clinicaId)
    .eq('tipo_mensaje', tipo)
    .maybeSingle()
}

async function logEnviado(supabase: ReturnType<typeof createAdminClient>, clinicaId: string, tipo: string) {
  await supabase.from('whatsapp_logs').insert({ clinica_id: clinicaId, tipo_mensaje: tipo, canal: 'email' })
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const stats = { dia1: 0, dia3: 0, dia5: 0, dia7: 0 }

  // ── Día 1: configuración ──────────────────────────────────────────────────
  const { data: dia1Rows } = await getTrialEnDia(supabase, now, 23, 25) // 23-25h desde registro
  for (const row of dia1Rows ?? []) {
    const clinica = Array.isArray(row.clinicas) ? row.clinicas[0] : row.clinicas
    const email = (clinica as { email?: string | null } | null)?.email
    const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? 'tu clínica'
    if (!email) continue
    const { data: ya } = await dedup(supabase, row.clinica_id, 'onboarding_dia1')
    if (ya) continue
    await dispatchEmail({
      tipo: 'onboarding_dia1',
      destinatario: email,
      datos: { clinica_nombre: nombre, dashboard_url: APP_URL } as never,
    }).catch(err => console.error('[trial-emails] dia1 error:', err))
    await logEnviado(supabase, row.clinica_id, 'onboarding_dia1')
    stats.dia1++
  }

  // ── Día 3: página de reservas ─────────────────────────────────────────────
  const { data: dia3Rows } = await getTrialEnDia(supabase, now, 71, 73) // 71-73h desde registro
  for (const row of dia3Rows ?? []) {
    const clinica = Array.isArray(row.clinicas) ? row.clinicas[0] : row.clinicas
    const email = (clinica as { email?: string | null; slug?: string | null } | null)?.email
    const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? 'tu clínica'
    const slug = (clinica as { slug?: string | null } | null)?.slug
    if (!email) continue
    const { data: ya } = await dedup(supabase, row.clinica_id, 'onboarding_dia3')
    if (ya) continue
    await dispatchEmail({
      tipo: 'onboarding_dia3',
      destinatario: email,
      datos: {
        clinica_nombre: nombre,
        book_url: slug ? `${APP_URL}/book/${slug}` : null,
        dashboard_url: APP_URL,
      } as never,
    }).catch(err => console.error('[trial-emails] dia3 error:', err))
    await logEnviado(supabase, row.clinica_id, 'onboarding_dia3')
    stats.dia3++
  }

  // ── Día 5: aviso vencimiento ──────────────────────────────────────────────
  const in47h = new Date(now.getTime() + 47 * 3600_000).toISOString()
  const in49h = new Date(now.getTime() + 49 * 3600_000).toISOString()
  const { data: warning5 } = await supabase
    .from('subscriptions')
    .select('clinica_id, trial_ends_at, clinicas(nombre, email)')
    .eq('estado', 'trial')
    .gte('trial_ends_at', in47h)
    .lte('trial_ends_at', in49h)

  for (const row of warning5 ?? []) {
    const clinica = Array.isArray(row.clinicas) ? row.clinicas[0] : row.clinicas
    const email = (clinica as { email?: string | null } | null)?.email
    const nombre = (clinica as { nombre?: string | null } | null)?.nombre ?? 'tu clínica'
    if (!email) continue
    const { data: ya } = await dedup(supabase, row.clinica_id, 'trial_expira_pronto')
    if (ya) continue
    await dispatchEmail({
      tipo: 'trial_expira_pronto',
      destinatario: email,
      datos: { clinica_nombre: nombre, dias_restantes: 2 } as never,
    }).catch(err => console.error('[trial-emails] day5 error:', err))
    await logEnviado(supabase, row.clinica_id, 'trial_expira_pronto')
    stats.dia5++
  }

  // ── Día 7: expirado ───────────────────────────────────────────────────────
  const hace24h = new Date(now.getTime() - 24 * 3600_000).toISOString()
  const { data: expired } = await supabase
    .from('subscriptions')
    .select('clinica_id, trial_ends_at, clinicas(nombre, email)')
    .eq('estado', 'trial')
    .lte('trial_ends_at', now.toISOString())
    .gte('trial_ends_at', hace24h)

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
    await supabase
      .from('subscriptions')
      .update({ estado: 'cancelada', updated_at: now.toISOString() })
      .eq('clinica_id', row.clinica_id)
    stats.dia7++
  }

  return NextResponse.json({ ok: true, ...stats })
}
