import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const paciente_id = request.nextUrl.searchParams.get('paciente_id')
  if (!paciente_id) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })

  const { data: member } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createAdminClient()

  const { data } = await db
    .from('consentimiento_solicitudes')
    .select('id, email_destino, estado, firmado_at, created_at, expires_at, cita:cita_id(inicio, servicios(nombre))')
    .eq('clinica_id', member.clinica_id)
    .order('created_at', { ascending: false })
    // Filter by paciente via cita join
    .in('cita_id', (
      await db.from('citas').select('id').eq('paciente_id', paciente_id).eq('clinica_id', member.clinica_id).then(r => r.data?.map(c => c.id) ?? [])
    ))

  return NextResponse.json({ solicitudes: data ?? [] })
}
