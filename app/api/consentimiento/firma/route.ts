import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const solicitud_id = request.nextUrl.searchParams.get('id')
  if (!solicitud_id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const db = createAdminClient()

  const { data: s } = await db
    .from('consentimiento_solicitudes')
    .select('clinica_id, firma_img, firmado_at, email_destino, plantilla:plantilla_id(titulo, contenido), cita:cita_id(inicio, pacientes(nombre), servicios(nombre))')
    .eq('id', solicitud_id)
    .single()

  if (!s) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data: member } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('clinica_id', s.clinica_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data: clinica } = await db.from('clinicas').select('nombre').eq('id', s.clinica_id).single()

  const cita = s.cita as unknown as { inicio: string; pacientes: { nombre: string } | null; servicios: { nombre: string } | null } | null
  const plantilla = s.plantilla as unknown as { titulo: string; contenido: string } | null

  return NextResponse.json({
    firma_img: s.firma_img,
    firmado_at: s.firmado_at,
    email_destino: s.email_destino,
    clinica_nombre: clinica?.nombre ?? '',
    paciente_nombre: cita?.pacientes?.nombre ?? '',
    servicio_nombre: cita?.servicios?.nombre ?? '',
    fecha_cita: cita?.inicio
      ? format(new Date(cita.inicio), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })
      : '',
    titulo: plantilla?.titulo ?? 'Consentimiento Informado',
    contenido: plantilla?.contenido ?? null,
  })
}
