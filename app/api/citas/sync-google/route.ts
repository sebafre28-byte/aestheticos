import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { syncCitaToGoogle } from '@/lib/google-calendar/sync'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  const body = await req.json() as { citaId: string; action?: 'create' | 'update' | 'delete' }
  const { citaId, action = 'create' } = body
  if (!citaId) return NextResponse.json({ ok: false })

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Get clinica_id from cita
  const { data: cita } = await sb.from('citas').select('clinica_id').eq('id', citaId).maybeSingle()
  if (!cita) return NextResponse.json({ ok: false })

  // Find all users in this clinica that have gcal tokens
  const { data: tokens } = await sb
    .from('google_calendar_tokens')
    .select('user_id')
    .eq('clinica_id', cita.clinica_id)

  if (!tokens || tokens.length === 0) return NextResponse.json({ ok: true, synced: 0 })

  let synced = 0
  for (const t of tokens) {
    const ok = await syncCitaToGoogle(citaId, t.user_id, cita.clinica_id, action)
    if (ok) synced++
  }

  return NextResponse.json({ ok: true, synced })
}
