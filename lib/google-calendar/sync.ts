// Sync a single cita to Google Calendar (server-side)
import { getTokenForUser, getValidAccessToken, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './client'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type Cita = {
  id: string
  inicio: string  // ISO timestamptz
  fin: string     // ISO timestamptz
  paciente?: { nombre: string } | null
  servicio?: { nombre: string } | null
  profesional?: { nombre: string } | null
  notas?: string | null
  google_event_id?: string | null
}

function buildEvent(cita: Cita, clinicaNombre: string) {
  const paciente = (cita.paciente as { nombre: string } | null)?.nombre ?? 'Paciente'
  const servicio = (cita.servicio as { nombre: string } | null)?.nombre ?? 'Cita'
  return {
    summary: `${servicio} — ${paciente}`,
    description: [
      (cita.profesional as { nombre: string } | null)?.nombre ? `Profesional: ${(cita.profesional as { nombre: string }).nombre}` : null,
      cita.notas ? `Notas: ${cita.notas}` : null,
      `Clínica: ${clinicaNombre}`,
    ].filter(Boolean).join('\n'),
    start: cita.inicio,
    end: cita.fin,
    extendedProperties: { private: { simpliclinic_cita_id: cita.id } },
  }
}

export async function syncCitaToGoogle(
  citaId: string,
  userId: string,
  clinicaId: string,
  action: 'create' | 'update' | 'delete' = 'create'
): Promise<boolean> {
  const token = await getTokenForUser(userId, clinicaId)
  if (!token) return false

  const accessToken = await getValidAccessToken(token)
  if (!accessToken) {
    console.error('[gcal-sync] Could not get valid access token for user', userId, '— check GOOGLE_CLIENT_ID/SECRET env vars or reconnect Google Calendar')
    return false
  }

  const sb = getServiceSupabase()

  if (action === 'delete') {
    const { data: cita } = await sb
      .from('citas')
      .select('google_event_id')
      .eq('id', citaId)
      .maybeSingle()
    if (cita?.google_event_id) {
      return deleteCalendarEvent(accessToken, token.calendar_id, cita.google_event_id)
    }
    return true
  }

  const { data: cita } = await sb
    .from('citas')
    .select('id, inicio, fin, google_event_id, notas, paciente:pacientes(nombre), servicio:servicios(nombre), profesional:profesionales(nombre)')
    .eq('id', citaId)
    .maybeSingle()

  if (!cita) return false

  const { data: clinica } = await sb
    .from('clinicas')
    .select('nombre')
    .eq('id', clinicaId)
    .maybeSingle()
  const clinicaNombre = clinica?.nombre ?? 'Clínica'

  const event = buildEvent(cita as unknown as Cita, clinicaNombre)

  if (action === 'update' && (cita as unknown as Cita).google_event_id) {
    const ok = await updateCalendarEvent(accessToken, token.calendar_id, (cita as unknown as Cita).google_event_id!, event)
    return ok
  }

  // create
  const created = await createCalendarEvent(accessToken, token.calendar_id, event)
  if (!created) return false

  await sb
    .from('citas')
    .update({ google_event_id: created.id })
    .eq('id', citaId)

  return true
}
