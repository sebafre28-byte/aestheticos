import type { CitaConRelaciones } from './types'

export async function triggerCitaJobs(citaId: string, action: 'schedule' | 'cancel' | 'reschedule'): Promise<void> {
  try {
    await fetch('/api/citas/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citaId, action }),
    })
  } catch (e) {
    console.warn('[agenda] triggerCitaJobs falló (no crítico):', e)
  }
}

export function triggerGoogleSync(citaId: string, action: 'create' | 'update' | 'delete' = 'update'): void {
  fetch('/api/citas/sync-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cita_id: citaId, action }),
  }).catch(() => {})
}

export function dispararNotificacionCita(cita: CitaConRelaciones, sesionesRecurrentes?: Array<{ fecha: string; hora: string }>) {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl')
  const paciente = cita.pacientes as { nombre: string; email?: string | null; telefono?: string | null } | null
  const profesional = cita.profesionales as { nombre: string } | null
  const servicio = cita.servicios as { nombre: string } | null
  const clinicaRaw = cita.clinicas as { nombre: string; email?: string | null; telefono?: string | null; direccion?: string | null; logo_url?: string | null } | null
  const clinica = {
    nombre: clinicaRaw?.nombre ?? '',
    telefono: clinicaRaw?.telefono ?? null,
    email: clinicaRaw?.email ?? null,
    direccion: clinicaRaw?.direccion ?? null,
    logo_url: clinicaRaw?.logo_url ?? null,
  }
  // When called from the client, the user's session cookie is sent automatically.
  // When called from the server (book/whatsapp flows), INTERNAL_API_SECRET is set.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window === 'undefined' && process.env.INTERNAL_API_SECRET) {
    headers['x-internal-secret'] = process.env.INTERNAL_API_SECRET
  }
  return fetch(`${base}/api/notificar-cita`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tipo: 'nueva_cita',
      canal: 'agenda',
      paciente: { nombre: paciente?.nombre ?? '', email: paciente?.email, telefono: paciente?.telefono },
      profesional: { nombre: profesional?.nombre ?? '' },
      servicio: { nombre: servicio?.nombre ?? '' },
      clinica,
      inicio: cita.inicio,
      fin: cita.fin,
      cancel_token: (cita as unknown as Record<string, unknown>).cancel_token ?? undefined,
      sesiones_recurrentes: sesionesRecurrentes ?? undefined,
    }),
  })
}
