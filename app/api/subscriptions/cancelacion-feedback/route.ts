import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { clinica_id, motivo } = await request.json() as { clinica_id?: string; motivo?: string }
  if (!clinica_id || !motivo) {
    return NextResponse.json({ error: 'clinica_id y motivo son requeridos' }, { status: 400 })
  }

  // Verify membership
  const { data: miembro } = await supabase
    .from('clinica_miembros')
    .select('clinica_id')
    .eq('user_id', user.id)
    .eq('clinica_id', clinica_id)
    .eq('estado', 'activo')
    .maybeSingle()

  if (!miembro) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const db = createAdminClient()
  await db
    .from('subscriptions')
    .update({ cancelacion_motivo: motivo, updated_at: new Date().toISOString() })
    .eq('clinica_id', clinica_id)

  return NextResponse.json({ ok: true })
}
