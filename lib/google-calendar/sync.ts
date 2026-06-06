import { createAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getValidToken } from './client'

export async function syncCitaToGoogle(citaId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: cita } = await supabase
    .from('citas')
    .select(`
      id, clinica_id, profesional_id, inicio, fin, estado, notas,
      pacientes(nombre, telefono, email),
      servicios(nombre),
      profesionales(nombre),
      clinicas(nombre, direccion)
    `)
    .eq('id', citaId)
    .single()

  if (!cita) return

  const { data: tokens } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('clinica_id', cita.clinica_id)

  if (!tokens?.length) return

  const paciente = Array.isArray(cita.pacientes) ? cita.pacientes[0] : cita.pacientes
  const servicio = Array.isArray(cita.servicios) ? cita.servicios[0] : cita.servicios
  const profesional = Array.isArray(cita.profesionales) ? cita.profesionales[0] : cita.profesionales
  const clinica = Array.isArray(cita.clinicas) ? cita.clinicas[0] : cita.clinicas

  const summary = `${(servicio as { nombre?: string } | null)?.nombre ?? 'Cita'} — ${(paciente as { nombre?: string } | null)?.nombre ?? 'Paciente'}`
  const description = [
    `Paciente: ${(paciente as { nombre?: string } | null)?.nombre ?? ''}`,
    (paciente as { telefono?: string | null } | null)?.telefono ? `Tel: ${(paciente as { telefono?: string } | null)?.telefono}` : '',
    `Profesional: ${(profesional as { nombre?: string } | null)?.nombre ?? ''}`,
    cita.notas ? `Notas: ${cita.notas}` : '',
  ].filter(Boolean).join('\n')

  for (const token of tokens) {
    // Check if this token's user should see this cita
    const { data: member } = await supabase
      .from('usuarios_clinica')
      .select('rol')
      .eq('user_id', token.user_id)
      .eq('clinica_id', cita.clinica_id)
      .maybeSingle()

    const { data: ownerClinica } = await supabase
      .from('clinicas')
      .select('id')
      .eq('id', cita.clinica_id)
      .eq('owner_id', token.user_id)
      .maybeSingle()

    const isAdmin = member?.rol === 'admin' || !!ownerClinica
    const isProfesionalOwner = token.user_id === cita.profesional_id

    if (!isAdmin && !isProfesionalOwner) continue

    const accessToken = await getValidToken(token)
    if (!accessToken) continue

    // Update token if refreshed
    if (accessToken !== token.access_token) {
      await supabase.from('google_calendar_tokens').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', token.id)
    }

    if (cita.estado === 'cancelada' || cita.estado === 'no_asistio') {
      const { data: existing } = await supabase
        .from('google_calendar_events')
        .select('google_event_id')
        .eq('cita_id', citaId)
        .eq('token_id', token.id)
        .maybeSingle()
      if (existing?.google_event_id) {
        await deleteCalendarEvent(accessToken, token.calendar_id, existing.google_event_id)
        await supabase.from('google_calendar_events').delete().eq('cita_id', citaId).eq('token_id', token.id)
      }
      continue
    }

    const eventData = {
      summary,
      description,
      location: (clinica as { direccion?: string | null } | null)?.direccion ?? undefined,
      start: { dateTime: cita.inicio, timeZone: 'America/Santiago' },
      end: { dateTime: cita.fin ?? cita.inicio, timeZone: 'America/Santiago' },
      extendedProperties: { private: { simpliclinic_cita_id: citaId } },
    }

    const { data: existingEvent } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('cita_id', citaId)
      .eq('token_id', token.id)
      .maybeSingle()

    if (existingEvent?.google_event_id) {
      await updateCalendarEvent(accessToken, token.calendar_id, existingEvent.google_event_id, eventData)
    } else {
      const created = await createCalendarEvent(accessToken, token.calendar_id, eventData)
      if (created?.id) {
        await supabase.from('google_calendar_events').insert({
          cita_id: citaId,
          token_id: token.id,
          clinica_id: cita.clinica_id,
          google_event_id: created.id,
          calendar_id: token.calendar_id,
        })
      }
    }
  }
}
