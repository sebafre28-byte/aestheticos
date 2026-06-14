import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  let token: string, nuevo_inicio: string, nuevo_fin: string
  try {
    const body = await req.json()
    token = body.token
    nuevo_inicio = body.nuevo_inicio
    nuevo_fin = body.nuevo_fin
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 })
  }

  if (!token || !nuevo_inicio || !nuevo_fin) {
    return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('reagendar_cita_por_token', {
    p_token: token,
    p_nuevo_inicio: nuevo_inicio,
    p_nuevo_fin: nuevo_fin,
  })

  if (error) {
    console.error('[cita/reagendar] RPC error:', error)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }

  const result = data as { ok: boolean; error?: string; cita_id?: string }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
