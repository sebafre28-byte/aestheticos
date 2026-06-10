// Google Calendar OAuth helpers (server-side only)
import { createClient as createServiceClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export type GCalToken = {
  id: string
  user_id: string
  clinica_id: string
  access_token: string
  refresh_token: string | null
  token_expiry: string | null
  calendar_id: string
  sync_mode: 'export' | 'bidireccional'
}

export async function getTokenForUser(userId: string, clinicaId: string): Promise<GCalToken | null> {
  const sb = getServiceSupabase()
  const { data } = await sb
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('clinica_id', clinicaId)
    .maybeSingle()
  return data as GCalToken | null
}

export async function getValidAccessToken(token: GCalToken): Promise<string | null> {
  if (token.token_expiry && new Date(token.token_expiry) > new Date(Date.now() + 60_000)) {
    return token.access_token
  }
  if (!token.refresh_token) {
    console.error('[gcal] No refresh_token for user', token.user_id)
    return null
  }
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[gcal] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set')
    return null
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    console.error('[gcal] Token refresh failed', await res.text())
    return null
  }
  const json = await res.json() as { access_token: string; expires_in: number }
  const expiry = new Date(Date.now() + json.expires_in * 1000).toISOString()
  const sb = getServiceSupabase()
  await sb
    .from('google_calendar_tokens')
    .update({ access_token: json.access_token, token_expiry: expiry })
    .eq('id', token.id)
  return json.access_token
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string
    description?: string
    start: string // ISO datetime
    end: string   // ISO datetime
    location?: string
    extendedProperties?: { private?: Record<string, string> }
  }
): Promise<{ id: string } | null> {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start, timeZone: 'America/Santiago' },
      end: { dateTime: event.end, timeZone: 'America/Santiago' },
      extendedProperties: event.extendedProperties,
    }),
  })
  if (!res.ok) {
    console.error('[gcal] createCalendarEvent failed', await res.text())
    return null
  }
  return res.json() as Promise<{ id: string }>
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: {
    summary: string
    description?: string
    start: string
    end: string
    location?: string
  }
): Promise<boolean> {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start, timeZone: 'America/Santiago' },
      end: { dateTime: event.end, timeZone: 'America/Santiago' },
    }),
  })
  return res.ok
}

export async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<{ id: string; summary?: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; extendedProperties?: { private?: Record<string, string> } }[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    console.error('[gcal] listCalendarEvents failed', await res.text())
    return []
  }
  const json = await res.json() as { items: unknown[] }
  return (json.items ?? []) as ReturnType<typeof listCalendarEvents> extends Promise<infer T> ? T : never
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.ok || res.status === 410 // 410 = already deleted
}
