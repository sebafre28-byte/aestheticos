import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCitaToGoogle } from '@/lib/google-calendar/sync'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { cita_id?: string }
  if (!body.cita_id) return NextResponse.json({ error: 'cita_id requerido' }, { status: 400 })

  await syncCitaToGoogle(body.cita_id)
  return NextResponse.json({ ok: true })
}
