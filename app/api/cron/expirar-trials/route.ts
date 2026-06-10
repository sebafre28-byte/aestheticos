import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Flip expired trials to 'cancelada'
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
    .eq('estado', 'trial')
    .lt('trial_ends_at', new Date().toISOString())
    .select('clinica_id')

  if (error) {
    console.error('[expirar-trials]', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, expirados: data?.length ?? 0 })
}
