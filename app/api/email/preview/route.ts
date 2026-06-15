import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEmailHtml, type TipoEmailCita, type DatosCita } from '@/app/api/email/route'
import { buildCumpleanosEmail, buildReactivacionEmail } from '@/lib/marketing/emails'

const TIPOS_CITA: TipoEmailCita[] = [
  'confirmacion_cita',
  'recordatorio_cita',
  'post_cita',
  'cancelacion_cita',
  'cancelacion_admin',
  'nueva_reserva_admin',
]

const TIPOS_MARKETING = ['email_cumpleanos', 'email_reactivacion'] as const
type TipoMarketing = typeof TIPOS_MARKETING[number]

const DATOS_EJEMPLO: DatosCita = {
  paciente_nombre:    'María González',
  paciente_email:     'maria@ejemplo.cl',
  paciente_telefono:  '+56912345678',
  servicio_nombre:    'Limpieza Facial',
  profesional_nombre: 'Dra. Ana García',
  fecha:              'jueves, 19 de junio',
  hora:               '11:00',
  hora_fin:           '11:45',
  clinica_nombre:     'Tu Clínica',
  clinica_telefono:   '+56912345678',
  clinica_email:      'hola@tuclinica.cl',
  clinica_direccion:  'Av. Providencia 1234, Santiago',
  canal:              'book',
  cancel_url:         '#',
  cancel_token:       'ejemplo-token-preview',
}

export async function GET(req: NextRequest) {
  // Require auth — only logged-in users can preview emails
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const tipo = req.nextUrl.searchParams.get('tipo') ?? ''

  // Use clinic's real name/logo if available
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('nombre, logo_url, telefono, email, direccion, configuracion')
    .maybeSingle()

  const clinicaNombre = clinica?.nombre ?? 'Tu Clínica'
  const clinicaLogo = clinica?.logo_url ?? undefined
  const config = (clinica?.configuracion as Record<string, unknown> | null) ?? {}
  const marketing = (config.marketing as Record<string, unknown> | null) ?? {}

  // Marketing email previews
  if (TIPOS_MARKETING.includes(tipo as TipoMarketing)) {
    let html = ''
    if (tipo === 'email_cumpleanos') {
      const r = buildCumpleanosEmail({
        paciente_nombre: 'María González',
        clinica_nombre: clinicaNombre,
        clinica_logo_url: clinicaLogo,
        mensaje_personalizado: (marketing.mensaje_cumpleanos as string | undefined) || undefined,
      })
      html = r.html
    } else if (tipo === 'email_reactivacion') {
      const r = buildReactivacionEmail({
        paciente_nombre: 'María González',
        clinica_nombre: clinicaNombre,
        clinica_logo_url: clinicaLogo,
        dias_sin_cita: 60,
        book_url: clinica ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.simpliclinic.cl'}/book/ejemplo` : undefined,
        mensaje_personalizado: (marketing.mensaje_reactivacion as string | undefined) || undefined,
      })
      html = r.html
    }
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Cita email previews
  if (!TIPOS_CITA.includes(tipo as TipoEmailCita)) {
    return NextResponse.json({ ok: false, error: 'tipo inválido' }, { status: 400 })
  }

  const datos: DatosCita = {
    ...DATOS_EJEMPLO,
    clinica_nombre:    clinicaNombre,
    clinica_logo_url:  clinicaLogo,
    clinica_telefono:  clinica?.telefono  ?? DATOS_EJEMPLO.clinica_telefono,
    clinica_email:     clinica?.email     ?? DATOS_EJEMPLO.clinica_email,
    clinica_direccion: clinica?.direccion ?? DATOS_EJEMPLO.clinica_direccion,
  }

  const html = buildEmailHtml(tipo as TipoEmailCita, datos)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
