import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function GET(req: NextRequest) {
  const conversacionId = req.nextUrl.searchParams.get('conversacion_id')
  if (!conversacionId) {
    return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  // Verify conversation belongs to user's clinic before fetching messages
  const { data: conv } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('id', conversacionId)
    .eq('clinica_id', miembro.clinicaId)
    .maybeSingle()
  if (!conv) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await supabase
    .from('mensajes_inbox')
    .select('id, direccion, contenido, tipo, estado_whatsapp, enviado_por, created_at')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('[inbox/mensajes]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
