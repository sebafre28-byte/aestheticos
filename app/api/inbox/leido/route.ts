import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { conversacion_id } = await req.json() as { conversacion_id: string }
  if (!conversacion_id) {
    return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('conversaciones')
    .update({ no_leidos: 0 })
    .eq('id', conversacion_id)

  if (error) {
    console.error('[inbox/leido]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
