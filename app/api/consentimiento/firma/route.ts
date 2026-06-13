import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const solicitud_id = request.nextUrl.searchParams.get('id')
  if (!solicitud_id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const db = createAdminClient()

  // Verificar que el usuario pertenece a la clínica de esta solicitud
  const { data: solicitud } = await db
    .from('consentimiento_solicitudes')
    .select('clinica_id, firma_img, firmado_at, email_destino')
    .eq('id', solicitud_id)
    .single()

  if (!solicitud) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data: member } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('clinica_id', solicitud.clinica_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  return NextResponse.json({
    firma_img: solicitud.firma_img,
    firmado_at: solicitud.firmado_at,
    email_destino: solicitud.email_destino,
  })
}
