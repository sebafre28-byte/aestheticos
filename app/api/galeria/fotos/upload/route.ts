import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClinicaIdForUser } from '@/lib/supabase/getClinicaId'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const miembro = await getClinicaIdForUser(supabase, user.id)
  if (!miembro) return NextResponse.json({ error: 'No perteneces a ninguna clínica' }, { status: 403 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })

  const file = form.get('file') as File | null
  const pacienteId = form.get('paciente_id') as string | null
  const tipo = (form.get('tipo') as string | null) ?? 'antes'
  const tratamiento = form.get('tratamiento') as string | null
  const descripcion = form.get('descripcion') as string | null
  const fechaFoto = (form.get('fecha_foto') as string | null) ?? new Date().toISOString().slice(0, 10)
  const notas = form.get('notas') as string | null
  const citaId = form.get('cita_id') as string | null

  if (!file || !pacienteId) return NextResponse.json({ error: 'Faltan file o paciente_id' }, { status: 400 })

  const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo se aceptan imágenes (jpg, png, webp, gif).' }, { status: 400 })
  }
  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const path = `${miembro.clinicaId}/${pacienteId}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: storageError } = await supabase.storage
    .from('galeria-clinica')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (storageError) return NextResponse.json({ error: `Storage: ${storageError.message}` }, { status: 500 })

  const { data, error } = await supabase
    .from('galeria_fotos')
    .insert({
      paciente_id: pacienteId,
      clinica_id: miembro.clinicaId,
      cita_id: citaId || null,
      tipo,
      tratamiento: tratamiento || null,
      descripcion: descripcion || null,
      foto_url: path,
      fecha_foto: fechaFoto,
      notas: notas || null,
      created_by: user.id,
    })
    .select('id, paciente_id, cita_id, tipo, descripcion, tratamiento, foto_url, fecha_foto, notas, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
