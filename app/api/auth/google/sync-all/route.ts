import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCitaToGoogle } from '@/lib/google-calendar/sync'
import { getValidToken, listCalendarEvents } from '@/lib/google-calendar/client'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createAdminClient()

  const { data: token } = await db
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!token) return NextResponse.json({ error: 'No conectado a Google Calendar' }, { status: 400 })

  // ── Paso 1: reconciliar eventos existentes en Google Calendar ──────────────
  // Busca eventos ya creados por SimpliClinic en Google y los registra en la DB
  // para evitar duplicados en el paso 2.
  const accessToken = await getValidToken(token)
  if (accessToken) {
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const hasta = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
    const googleEvents = await listCalendarEvents(accessToken, token.calendar_id, desde, hasta)

    for (const ev of googleEvents) {
      const citaId = ev.extendedProperties?.private?.simpliclinic_cita_id
      if (!citaId || !ev.id) continue

      // Si no tenemos registro en DB, lo creamos para que el sync no duplique
      const { data: existing } = await db
        .from('google_calendar_events')
        .select('id')
        .eq('cita_id', citaId)
        .eq('token_id', token.id)
        .maybeSingle()

      if (!existing) {
        await db.from('google_calendar_events').insert({
          cita_id: citaId,
          token_id: token.id,
          clinica_id: token.clinica_id,
          google_event_id: ev.id,
          calendar_id: token.calendar_id,
        })
      }
    }
  }

  // ── Paso 2: sincronizar citas del rango ────────────────────────────────────
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
