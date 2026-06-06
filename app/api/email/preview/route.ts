import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEmailHtml, type TipoEmailCita, type DatosCita } from '@/app/api/email/route'

const TIPOS_PERMITIDOS: TipoEmailCita[] = [
  'confirmacion_cita',
  'recordatorio_cita',
  'post_cita',
  'cancelacion_cita',
  'cancelacion_admin',
  'nueva_reserva_admin',
]

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
  cancel_url:         '#', // example link
}

export async function GET(req: NextRequest) {
  // Require auth — only logged-in users can preview emails
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const tipo = req.nextUrl.searchParams.get('tipo') as TipoEmailCita | null
  if (!tipo || !TIPOS_PERMITIDOS.includes(tipo)) {
    return NextResponse.json({ ok: false, error: 'tipo inválido' }, { status: 400 })
  }

  // Use clinic's real name/logo if available
  const { data: clinica } = await supabase
    .from('clinicas')
    .select('nombre, logo_url, telefono, email, direccion')
    .maybeSingle()

  const datos: DatosCita = {
    ...DATOS_EJEMPLO,
    clinica_nombre:    clinica?.nombre    ?? DATOS_EJEMPLO.clinica_nombre,
    clinica_logo_url:  clinica?.logo_url  ?? undefined,
    clinica_telefono:  clinica?.telefono  ?? DATOS_EJEMPLO.clinica_telefono,
    clinica_email:     clinica?.email     ?? DATOS_EJEMPLO.clinica_email,
    clinica_direccion: clinica?.direccion ?? DATOS_EJEMPLO.clinica_direccion,
  }

  const html = buildEmailHtml(tipo, datos)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
