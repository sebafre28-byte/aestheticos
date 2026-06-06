import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: miembro } = await supabase
    .from('usuarios_clinica').select('rol, clinica_id').eq('user_id', user.id).maybeSingle()
  if (!miembro || (miembro.rol !== 'admin' && miembro.rol !== 'profesional'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Get foto_url to delete from storage
  const { data: foto } = await supabase
    .from('galeria_fotos')
    .select('foto_url')
    .eq('id', id)
    .eq('clinica_id', miembro.clinica_id)
    .maybeSingle()

  const { error } = await supabase
    .from('galeria_fotos')
    .delete()
    .eq('id', id)
    .eq('clinica_id', miembro.clinica_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (foto?.foto_url) {
    await supabase.storage.from('galeria-clinica').remove([foto.foto_url])
  }

  return NextResponse.json({ ok: true })
}
