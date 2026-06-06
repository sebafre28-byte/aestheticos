import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'
import { getValidToken, listCalendarEvents } from '@/lib/google-calendar/client'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ events: [] })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ events: [] })

  const timeMin = req.nextUrl.searchParams.get('timeMin') ?? new Date().toISOString()
  const timeMax = req.nextUrl.searchParams.get('timeMax') ?? new Date(Date.now() + 7 * 86400000).toISOString()

  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', user.id)
    .eq('clinica_id', miembro.clinicaId)
    .maybeSingle()

  if (!token) return NextResponse.json({ events: [] })

  const accessToken = await getValidToken(token)
  if (!accessToken) return NextResponse.json({ events: [] })

  const events = await listCalendarEvents(accessToken, token.calendar_id, timeMin, timeMax)

  const externalEvents = events.filter(
    (e) => !e.extendedProperties?.private?.simpliclinic_cita_id
  )

  return NextResponse.json({
    events: externalEvents.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start.dateTime,
      end: e.end.dateTime,
    })),
  })
}
