import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'
import { getValidToken, listCalendarEvents } from '@/lib/google-calendar/client'

export interface GoogleExternalEvent {
  id: string
  summary: string
  start: string
  end: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ events: [] })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ events: [] })

  // Support legacy timeMin/timeMax params and new fecha+profesional_id params
  const fecha = req.nextUrl.searchParams.get('fecha')
  const profesionalId = req.nextUrl.searchParams.get('profesional_id')

  let timeMin: string
  let timeMax: string
  let targetUserId: string = user.id

  if (fecha) {
    // Build timeMin/timeMax for the full day in UTC-4 (Chile standard)
    timeMin = `${fecha}T00:00:00-04:00`
    timeMax = `${fecha}T23:59:59-04:00`
  } else {
    timeMin = req.nextUrl.searchParams.get('timeMin') ?? new Date().toISOString()
    timeMax = req.nextUrl.searchParams.get('timeMax') ?? new Date(Date.now() + 7 * 86400000).toISOString()
  }

  // If profesional_id is provided, find the user_id linked to that profesional
  if (profesionalId) {
    const { data: uc } = await supabase
      .from('usuarios_clinica')
      .select('user_id')
      .eq('profesional_id', profesionalId)
      .eq('clinica_id', miembro.clinicaId)
      .eq('activo', true)
      .maybeSingle()

    if (!uc) return NextResponse.json({ events: [] })
    targetUserId = uc.user_id
  }

  // Fetch token — only for pull_only or bidirectional sync modes
  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('clinica_id', miembro.clinicaId)
    .in('sync_mode', ['pull_only', 'bidirectional'])
    .maybeSingle()

  if (!token) return NextResponse.json({ events: [] })

  const accessToken = await getValidToken(token)
  if (!accessToken) return NextResponse.json({ events: [] })

  const rawEvents = await listCalendarEvents(accessToken, token.calendar_id, timeMin, timeMax)

  // Exclude events that were pushed by SimpliClinic (they have our private extended property)
  const externalEvents = rawEvents.filter(
    (e) => !e.extendedProperties?.private?.simpliclinic_cita_id
  )

  const events: GoogleExternalEvent[] = externalEvents
    .filter((e) => e.start.dateTime && e.end.dateTime)
    .map((e) => ({
      id: e.id,
      summary: e.summary ?? '(sin título)',
      start: e.start.dateTime as string,
      end: e.end.dateTime as string,
    }))

  return NextResponse.json({ events })
}
