import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const pacienteId = req.nextUrl.searchParams.get('paciente_id')
  if (!pacienteId) return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  const { data, error } = await supabase
    .from('galeria_fotos')
    .select('id, paciente_id, cita_id, tipo, descripcion, tratamiento, foto_url, fecha_foto, notas, created_at')
    .eq('paciente_id', pacienteId)
    .eq('clinica_id', miembro.clinicaId)
    .order('fecha_foto', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const signed = await Promise.all((data ?? []).map(async (row) => {
    let foto_signed: string | null = null
    if (row.foto_url) {
      const { data: s } = await supabase.storage.from('galeria-clinica').createSignedUrl(row.foto_url, 3600)
      foto_signed = s?.signedUrl ?? null
    }
    return { ...row, foto_signed }
  }))

  return NextResponse.json({ data: signed })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { paciente_id, cita_id, tipo, descripcion, tratamiento, foto_url, fecha_foto, notas } = body
  if (!paciente_id || !tipo || !foto_url || !fecha_foto)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const { data: miembro } = await supabase
    .from('usuarios_clinica').select('clinica_id').eq('user_id', user.id).maybeSingle()
  if (!miembro?.clinica_id) return NextResponse.json({ error: 'Sin clínica' }, { status: 403 })

  const { data, error } = await supabase
    .from('galeria_fotos')
    .insert({
      paciente_id,
      clinica_id: miembro.clinica_id,
      cita_id: cita_id ?? null,
      tipo,
      descripcion: descripcion ?? null,
      tratamiento: tratamiento ?? null,
      foto_url,
      fecha_foto,
      notas: notas ?? null,
      created_by: user.id,
    })
    .select('id, paciente_id, cita_id, tipo, descripcion, tratamiento, foto_url, fecha_foto, notas, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
