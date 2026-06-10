import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncCitaToGoogle } from '@/lib/google-calendar/sync'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Get user's clinica
  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('clinica_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!token) return NextResponse.json({ error: 'No conectado a Google Calendar' }, { status: 400 })

  // Get upcoming and recent citas (last 7 days + next 60 days)
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const hasta = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const { data: citas } = await supabase
    .from('citas')
    .select('id')
    .eq('clinica_id', token.clinica_id)
    .not('estado', 'in', '("cancelada","no_asistio")')
    .gte('inicio', desde)
    .lte('inicio', hasta)

  if (!citas?.length) return NextResponse.json({ synced: 0 })

  let synced = 0
  for (const cita of citas) {
    try {
      await syncCitaToGoogle(cita.id, 'update')
      synced++
    } catch {
      // continue on individual failures
    }
  }

  return NextResponse.json({ synced })
}
