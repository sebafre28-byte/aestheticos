import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const conversacionId = req.nextUrl.searchParams.get('conversacion_id')
  if (!conversacionId) {
    return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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
