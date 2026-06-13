import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const cita_id = request.nextUrl.searchParams.get('cita_id')
  if (!cita_id) return NextResponse.json({ error: 'cita_id requerido' }, { status: 400 })

  const { data } = await supabase
    .from('consentimiento_solicitudes')
    .select('id, email_destino, estado, firmado_at, created_at, expires_at')
    .eq('cita_id', cita_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ solicitudes: data ?? [] })
}
