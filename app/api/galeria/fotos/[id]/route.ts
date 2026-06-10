import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro || (miembro.rol !== 'admin' && miembro.rol !== 'profesional'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data: foto } = await supabase
    .from('galeria_fotos')
    .select('foto_url')
    .eq('id', id)
    .eq('clinica_id', miembro.clinicaId)
    .maybeSingle()

  const { error } = await supabase
    .from('galeria_fotos')
    .delete()
    .eq('id', id)
    .eq('clinica_id', miembro.clinicaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (foto?.foto_url) {
    await supabase.storage.from('galeria-clinica').remove([foto.foto_url])
  }

  return NextResponse.json({ ok: true })
}
