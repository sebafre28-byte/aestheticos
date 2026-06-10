// Imports Google Calendar events as bloqueos for the linked profesional.
// Called when sync_mode is 'importar' or 'bidireccional'.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getTokenForUser, getValidAccessToken, listCalendarEvents } from '@/lib/google-calendar/client'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Resolve clinica_id
  const { data: ucData } = await supabase.from('usuarios_clinica').select('clinica_id, profesional_id').eq('user_id', user.id).maybeSingle()
  let clinicaId = ucData?.clinica_id as string | null
  const profesionalId = ucData?.profesional_id as string | null
  if (!clinicaId) {
    const { data: own } = await supabase.from('clinicas').select('id').eq('owner_id', user.id).maybeSingle()
    clinicaId = own?.id ?? null
  }
  if (!clinicaId) return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 400 })
  if (!profesionalId) return NextResponse.json({ error: 'Usuario sin profesional vinculado. Vincula tu perfil en Configuración → Equipo.' }, { status: 400 })

  const token = await getTokenForUser(user.id, clinicaId)
  if (!token) return NextResponse.json({ error: 'Google Calendar no conectado' }, { status: 400 })

  const accessToken = await getValidAccessToken(token)
  if (!accessToken) return NextResponse.json({ error: 'No se pudo obtener token válido. Reconecta Google Calendar.' }, { status: 500 })

  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const events = await listCalendarEvents(accessToken, token.calendar_id, timeMin, timeMax)

  // Filter out events that were created by SimpliClinic (have simpliclinic_cita_id)
  const externalEvents = events.filter(e => !e.extendedProperties?.private?.simpliclinic_cita_id)

  // Get existing gcal bloqueos to avoid duplicates
  const { data: existing } = await sb
    .from('agenda_bloqueos')
    .select('gcal_event_id')
    .eq('profesional_id', profesionalId)
    .not('gcal_event_id', 'is', null)

  const existingIds = new Set((existing ?? []).map((b: { gcal_event_id: string }) => b.gcal_event_id))

  let importados = 0
  for (const ev of externalEvents) {
    if (existingIds.has(ev.id)) continue
    const start = ev.start.dateTime ?? `${ev.start.date}T08:00:00`
    const end = ev.end.dateTime ?? `${ev.end.date}T09:00:00`
    if (!start || !end) continue

    const { error } = await sb.from('agenda_bloqueos').insert({
      clinica_id: clinicaId,
      profesional_id: profesionalId,
      inicio: start,
      fin: end,
      titulo: ev.summary ?? 'Bloqueado (Google Calendar)',
      gcal_event_id: ev.id,
    })
    if (!error) importados++
  }

  return NextResponse.json({ importados })
}
