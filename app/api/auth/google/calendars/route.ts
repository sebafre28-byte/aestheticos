import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/google-calendar/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: token } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 404 })

  const accessToken = await getValidToken(token)
  if (!accessToken) return NextResponse.json({ error: 'Token invalid' }, { status: 401 })

  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 502 })

  const data = await res.json()
  const calendars = (data.items ?? []).map((c: { id: string; summary: string; backgroundColor?: string; primary?: boolean }) => ({
    id: c.id,
    summary: c.summary,
    backgroundColor: c.backgroundColor,
    primary: c.primary ?? false,
  }))

  return NextResponse.json({ calendars, selected: token.calendar_id })
}
