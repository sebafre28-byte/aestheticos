import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsappReminderInternal, type WhatsappLogTipo } from '@/lib/whatsapp/jobs'

export const runtime = 'nodejs'

type Body = {
  citaId?: string
  tipo?: WhatsappLogTipo
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.citaId) {
    return NextResponse.json({ error: 'citaId es obligatorio' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: cita, error: citaErr } = await supabase
    .from('citas')
    .select('clinica_id')
    .eq('id', body.citaId)
    .maybeSingle()

  if (citaErr || !cita) {
    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
  }

  const tipo: WhatsappLogTipo =
    body.tipo === 'post_cita'
      ? 'post_cita'
      : body.tipo === 'confirmacion'
        ? 'confirmacion'
        : 'manual'

  const result = await sendWhatsappReminderInternal(supabase, {
    clinicaId: cita.clinica_id,
    citaId: body.citaId,
    tipoMensaje: tipo,
  })

  return NextResponse.json({ result })
}
