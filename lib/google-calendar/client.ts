const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

export interface GoogleTokens {
  access_token: string
  refresh_token: string
  expiry_date: number // ms timestamp
  scope: string
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expiry_date: number } | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json() as { access_token: string; expires_in: number }
  return { access_token: data.access_token, expiry_date: Date.now() + data.expires_in * 1000 }
}

export async function getValidToken(tokenRow: { access_token: string; refresh_token: string; token_expiry: string }): Promise<string | null> {
  if (new Date(tokenRow.token_expiry) > new Date(Date.now() + 60_000)) return tokenRow.access_token
  const refreshed = await refreshAccessToken(tokenRow.refresh_token)
  return refreshed?.access_token ?? null
}

export interface GoogleCalendarEvent {
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  extendedProperties?: { private?: Record<string, string> }
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent,
): Promise<{ id: string } | null> {
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  if (!res.ok) return null
  return res.json()
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
): Promise<boolean> {
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  })
  return res.ok
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<boolean> {
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.ok || res.status === 404
}

export async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<{ id: string; summary: string; start: { dateTime?: string }; end: { dateTime?: string }; extendedProperties?: { private?: Record<string, string> } }[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = await res.json() as { items: unknown[] }
  return (data.items ?? []) as { id: string; summary: string; start: { dateTime?: string }; end: { dateTime?: string }; extendedProperties?: { private?: Record<string, string> } }[]
}
