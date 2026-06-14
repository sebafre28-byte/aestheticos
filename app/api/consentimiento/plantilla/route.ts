import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function getClinicaId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('usuarios_clinica')
    .select('clinica_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data?.clinica_id ?? null
}

// POST — crear o actualizar plantilla
export async function POST(request: NextRequest) {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { id, titulo, contenido, servicio_id } = body

  if (!titulo || !contenido) {
    return NextResponse.json({ error: 'Título y contenido requeridos' }, { status: 400 })
  }

  const db = createAdminClient()

  // Limit 3 plantillas per clinica
  if (!id) {
    const { count } = await db
      .from('consentimiento_plantillas')
      .select('id', { count: 'exact', head: true })
      .eq('clinica_id', clinicaId)
      .eq('activo', true)
    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Límite de 3 plantillas alcanzado' }, { status: 400 })
    }
  }

  if (id) {
    const { data, error } = await db
      .from('consentimiento_plantillas')
      .update({ titulo, contenido, servicio_id: servicio_id ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinica_id', clinicaId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ plantilla: data })
  }

  const { data, error } = await db
    .from('consentimiento_plantillas')
    .insert({ clinica_id: clinicaId, titulo, contenido, servicio_id: servicio_id ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plantilla: data })
}

// DELETE — eliminar (soft-delete) plantilla
export async function DELETE(request: NextRequest) {
  const clinicaId = await getClinicaId()
  if (!clinicaId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db
    .from('consentimiento_plantillas')
    .update({ activo: false })
    .eq('id', id)
    .eq('clinica_id', clinicaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
