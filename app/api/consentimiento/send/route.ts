import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { crearSolicitud } from '@/lib/consentimientos/queries'
import { buildConsentimientoEmail, type DatosConsentimiento } from '@/app/api/email/route'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json() as { cita_id?: string; email_destino?: string; plantilla_id?: string }
  const { cita_id, email_destino, plantilla_id } = body

  if (!cita_id || !email_destino) {
    return NextResponse.json({ error: 'cita_id y email_destino requeridos' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: cita } = await db
    .from('citas')
    .select('id, clinica_id, inicio, pacientes(nombre), servicios(nombre), profesionales(nombre)')
    .eq('id', cita_id)
    .single()

  if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

  const { data: member } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('clinica_id', cita.clinica_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const solicitud = await crearSolicitud({
    clinica_id: cita.clinica_id,
    cita_id,
    plantilla_id: plantilla_id ?? null,
    email_destino,
  })

  const { data: clinica } = await db.from('clinicas').select('nombre').eq('id', cita.clinica_id).single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const link = `${appUrl}/consentimiento/${solicitud.token}`
  const pacienteNombre = (cita.pacientes as unknown as { nombre: string } | null)?.nombre ?? 'Paciente'
  const servicioNombre = (cita.servicios as unknown as { nombre: string } | null)?.nombre ?? 'Procedimiento'
  const clinicaNombre = clinica?.nombre ?? 'La clínica'
  const fechaCita = format(new Date(cita.inicio), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })

  // Llamar directo a Resend — evita self-loopback HTTP que falla en Vercel
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    const datos: DatosConsentimiento = {
      paciente_nombre: pacienteNombre,
      clinica_nombre: clinicaNombre,
      servicio_nombre: servicioNombre,
      fecha_cita: fechaCita,
      link_firma: link,
    }
    const { subject, html } = buildConsentimientoEmail(datos)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'SimpliClinic <onboarding@resend.dev>',
          to: [email_destino],
          subject,
          html,
        }),
      })
      if (!res.ok) {
        const t = await res.text()
        console.error('[consentimiento/send] Resend error:', res.status, t)
      }
    } catch (err) {
      console.error('[consentimiento/send] fetch error:', err)
    }
  } else {
    console.warn('[consentimiento/send] RESEND_API_KEY no configurada')
  }

  return NextResponse.json({ ok: true, solicitud_id: solicitud.id })
}
