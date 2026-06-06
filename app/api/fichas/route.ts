import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const pacienteId = req.nextUrl.searchParams.get('paciente_id')
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('fichas_clinicas')
    .select('id, paciente_id, tipo_tratamiento, contenido, notas, created_at')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { paciente_id, tipo_tratamiento, contenido, notas } = body
  if (!paciente_id || !tipo_tratamiento) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const { data: miembro } = await supabase
    .from('usuarios_clinica').select('clinica_id').eq('user_id', user.id).maybeSingle()
  if (!miembro?.clinica_id) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  const { data, error } = await supabase
    .from('fichas_clinicas')
    .insert({
      paciente_id,
      clinica_id: miembro.clinica_id,
      tipo_tratamiento,
      contenido: contenido ?? {},
      notas: notas ?? null,
      created_by: user.id,
    })
    .select('id, paciente_id, tipo_tratamiento, contenido, notas, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
