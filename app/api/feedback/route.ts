import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 })

  const { cita_id, clinica_id, rating, respuestas, comentario } = body
  if (!cita_id || !clinica_id || !['excelente', 'regular', 'mala'].includes(rating)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify cita belongs to clinica
  const { data: cita } = await supabase
    .from('citas')
    .select('id, paciente_id')
    .eq('id', cita_id)
    .eq('clinica_id', clinica_id)
    .maybeSingle()

  if (!cita) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { error } = await supabase
    .from('feedback_citas')
    .upsert(
      { cita_id, clinica_id, paciente_id: cita.paciente_id, rating, respuestas: respuestas ?? null, comentario: comentario || null },
      { onConflict: 'cita_id' }
    )

  if (error) {
    console.error('[feedback]', error)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
